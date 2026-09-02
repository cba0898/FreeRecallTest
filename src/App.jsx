import { useEffect, useMemo, useRef, useState } from 'react'
import { TEST_CONFIG } from './testConfig'
import './App.css'

function App() {
  const [config, setConfig] = useState(TEST_CONFIG)
  const { words, wordsPerRound, wordDurationSeconds, restDurationSeconds, holdDurationMilliseconds, environments } = config
  const activeEnvironments = environments
  const activeWordsPerRound = config.debug ? 1 : wordsPerRound
  const activeRestDuration = config.debug ? 1 : restDurationSeconds
  const [environmentIndex, setEnvironmentIndex] = useState(0)
  const [phase, setPhase] = useState('setup')
  const [roundWords, setRoundWords] = useState([])
  const [wordIndex, setWordIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [answer, setAnswer] = useState('')
  const [roundResults, setRoundResults] = useState([])
  const [resultId, setResultId] = useState('')
  const [isHolding, setIsHolding] = useState(false)
  const [holdProgress, setHoldProgress] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const audioRef = useRef(null)
  const holdIntervalRef = useRef(null)
  const environment = activeEnvironments[environmentIndex]
  const cleanWords = useMemo(() => words.map((word) => word.trim()).filter(Boolean), [words])

  useEffect(() => {
    fetch(TEST_CONFIG.resultsEndpoint)
      .then((response) => response.json())
      .then((remote) => {
        const remoteConfig = remote.config || {}
        setConfig((current) => ({
          ...current,
          words: Array.isArray(remote.words) ? remote.words : current.words,
          wordsPerRound: Number(remoteConfig.wordsPerRound) || current.wordsPerRound,
          wordDurationSeconds: Number(remoteConfig.wordDurationSeconds) || current.wordDurationSeconds,
          restDurationSeconds: Number(remoteConfig.restDurationSeconds) || current.restDurationSeconds,
          holdDurationMilliseconds: Number(remoteConfig.holdDurationMilliseconds) || current.holdDurationMilliseconds,
        }))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!['present', 'rest'].includes(phase)) return undefined
    const duration = phase === 'present' ? wordDurationSeconds : activeRestDuration
    setTimeLeft(duration)
    const timer = window.setInterval(() => setTimeLeft((value) => Math.max(0, Math.round((value - 0.1) * 10) / 10)), 100)
    return () => window.clearInterval(timer)
  }, [phase, wordDurationSeconds, activeRestDuration, wordIndex])

  useEffect(() => {
    if (phase === 'present' && timeLeft === 0) {
      if (wordIndex + 1 < roundWords.length) {
        setWordIndex((value) => value + 1)
        setTimeLeft(wordDurationSeconds)
      } else {
        setTimeLeft(activeRestDuration)
        setPhase('rest')
      }
    } else if (phase === 'rest' && timeLeft === 0) {
      setPhase('recall')
    }
  }, [phase, timeLeft, wordIndex, roundWords.length, wordDurationSeconds, activeRestDuration])

  useEffect(() => {
    if (!audioRef.current) return
    audioRef.current.pause()
    audioRef.current.currentTime = 0
    audioRef.current.src = environment.bgm || ''
    audioRef.current.loop = true
  }, [environment])

  useEffect(() => {
    if (!audioRef.current || !environment.bgm) return
    if (phase === 'present' || phase === 'rest') {
      audioRef.current.play().catch(() => {})
    } else {
      audioRef.current.pause()
    }
  }, [phase, environment.bgm])

  const beginRound = (index = environmentIndex) => {
    const shuffled = [...cleanWords].sort(() => Math.random() - 0.5)
    setEnvironmentIndex(index)
    setRoundWords(shuffled.slice(0, Math.min(activeWordsPerRound, shuffled.length)))
    setWordIndex(0)
    setTimeLeft(wordDurationSeconds)
    setAnswers([])
    setAnswer('')
    setPhase('present')
  }

  const submitAnswer = (event) => {
    event.preventDefault()
    if (!answer.trim() || answers.length >= roundWords.length) return
    setAnswers((current) => [...current, answer.trim()])
    setAnswer('')
  }

  const removeAnswer = (indexToRemove) => {
    setAnswers((current) => current.filter((_, index) => index !== indexToRemove))
  }

  const finishRound = () => {
    const normalize = (value) => value.trim().toLowerCase().replace(/\s+/g, '')
    const correct = answers.filter((value) => roundWords.some((word) => normalize(word) === normalize(value)))
    const result = {
      environment: environment.name,
      correct: correct.length,
      total: answers.length,
      presented: roundWords.length,
      presentedWords: roundWords,
      answers,
    }
    const completedResults = [...roundResults, result]
    setRoundResults(completedResults)
    if (environmentIndex === activeEnvironments.length - 1 && TEST_CONFIG.resultsEndpoint) {
      const id = `FRT-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
      setResultId(id)
      fetch(TEST_CONFIG.resultsEndpoint, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ resultId: id, results: completedResults }),
      }).catch(() => {})
    }
    setPhase('results')
  }

  const startHold = (event) => {
    event.preventDefault()
    if (isHolding) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    setIsHolding(true)
    setHoldProgress(0)
    const startedAt = performance.now()
    holdIntervalRef.current = window.setInterval(() => {
      const progress = Math.min((performance.now() - startedAt) / holdDurationMilliseconds, 1)
      setHoldProgress(progress)
      if (progress >= 1) {
        window.clearInterval(holdIntervalRef.current)
        holdIntervalRef.current = null
        setIsHolding(false)
        finishRound()
      }
    }, 16)
  }

  const cancelHold = () => {
    if (holdIntervalRef.current) window.clearInterval(holdIntervalRef.current)
    holdIntervalRef.current = null
    if (isHolding) {
      setIsHolding(false)
      setHoldProgress(0)
    }
  }

  const nextEnvironment = () => beginRound(environmentIndex + 1)
  const openSurvey = () => {
    const { surveyUrl, surveyEntryId } = TEST_CONFIG
    const url = surveyEntryId
      ? `${surveyUrl}?usp=pp_url&entry.${surveyEntryId}=${encodeURIComponent(resultId)}`
      : surveyUrl
    window.open(url, '_blank', 'noopener,noreferrer')
  }
  const latest = roundResults.at(-1)
  const totalCorrect = roundResults.reduce((sum, result) => sum + result.correct, 0)
  const totalAnswers = roundResults.reduce((sum, result) => sum + result.total, 0)
  const totalPresented = roundResults.reduce((sum, result) => sum + result.presented, 0)

  return (
    <main className="app-shell">
      <audio ref={audioRef} />
      <header className="app-header">
        <div><h1>Free Recall Test</h1><p className="subtitle">단어를 기억하고, 자유롭게 떠올려 보세요.</p></div>
      </header>

      {phase === 'setup' && <section className="panel setup-panel">
        <div className="section-heading"><span className="step">01</span><div><h2>단어 자유 연상 검사</h2><p>{activeEnvironments.length}개 환경을 순서대로 진행합니다.</p></div></div>
        <div className="sequence">{activeEnvironments.map((item, index) => <div className="sequence-item" key={item.id}><span className="environment-dot" style={{ backgroundColor: item.color }} /><span>{index + 1}. {item.name}</span></div>)}</div>
        <p className="config-note">총 {cleanWords.length}개 단어 중 라운드마다 {Math.min(activeWordsPerRound, cleanWords.length)}개가 무작위로 제시됩니다.</p>
        <button className="primary-button" onClick={() => beginRound(0)} disabled={!cleanWords.length}>검사 시작하기 <span>→</span></button>
      </section>}

      {phase === 'present' && <section className="test-stage"><p className="stage-label">{environment.name} · {wordIndex + 1} / {roundWords.length}</p><div className="word-card"><span>{roundWords[wordIndex]}</span></div><div className="progress-track"><div className="progress-fill" key={`${environmentIndex}-${wordIndex}`} style={{ '--duration': `${wordDurationSeconds}s` }} /></div><p className="countdown">{timeLeft.toFixed(1)}초 동안 기억하세요</p></section>}

      {phase === 'rest' && <section className="test-stage"><p className="stage-label">잠시 쉬는 시간</p><div className="rest-card"><span>곧 입력을 시작합니다</span><strong>{timeLeft}</strong></div><div className="progress-track"><div className="progress-fill rest-fill" key={`rest-${environmentIndex}`} style={{ '--duration': `${activeRestDuration}s` }} /></div></section>}

      {phase === 'recall' && <section className="panel recall-panel"><p className="stage-label">기억나는 단어를 하나씩 입력하세요</p><h2>{environment.name}</h2><form onSubmit={submitAnswer} className="answer-form"><input autoFocus disabled={answers.length >= roundWords.length} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder={answers.length >= roundWords.length ? '제시된 단어 수만큼 입력했습니다' : '단어를 입력하고 Enter'} /><button type="submit" disabled={answers.length >= roundWords.length}>추가</button></form><div className="answer-chips">{answers.map((item, index) => <span className="answer-chip" key={`${item}-${index}`}><span>{item}</span><button type="button" onClick={() => removeAnswer(index)} aria-label={`${item} 삭제`}>×</button></span>)}</div><button className="primary-button hold-button" onPointerDown={startHold} onPointerUp={cancelHold} onPointerLeave={cancelHold} onPointerCancel={cancelHold} aria-label="입력 완료 버튼을 0.5초 동안 누르세요"><span className="hold-fill" style={{ transform: `scaleX(${holdProgress})` }} /><span className="hold-label">{isHolding ? '계속 누르세요' : `입력 완료 (${answers.length}개)`}</span><span className="hold-arrow">→</span></button></section>}

      {phase === 'results' && <section className="panel results-panel"><p className="eyebrow">{environmentIndex + 1} / {activeEnvironments.length} ROUND COMPLETE</p><h2>라운드 결과</h2><div className="score"><strong>{latest?.correct ?? 0}</strong><span>/ {latest?.presented ?? 0}개 정답</span></div><p>제시 단어 기준 정답률: <b>{latest?.presented ? Math.round((latest.correct / latest.presented) * 100) : 0}%</b></p><p className="sub-result">입력 단어: {latest?.total ?? 0}개 · 입력 기준 정답률: {latest?.total ? Math.round((latest.correct / latest.total) * 100) : 0}%</p>{roundResults.length === activeEnvironments.length && <div className="summary"><h3>종합 결과</h3>{roundResults.map((result) => <p key={result.environment}><span>{result.environment}</span><b>{result.correct} / {result.presented}</b></p>)}<p className="summary-total"><span>전체</span><b>{totalCorrect} / {totalPresented}</b></p><button className="survey-button" onClick={openSurvey}>설문하기 <span>↗</span></button></div>}{environmentIndex + 1 < activeEnvironments.length && <button className="primary-button next-button" onClick={nextEnvironment}>다음 환경 <span>→</span></button>}</section>}
      <footer><span>Free Recall Test</span><span>Round {Math.min(environmentIndex + 1, activeEnvironments.length)} / {activeEnvironments.length}</span></footer>
    </main>
  )
}

export default App
