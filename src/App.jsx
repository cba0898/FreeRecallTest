import { useEffect, useMemo, useRef, useState } from 'react'
import { TEST_CONFIG } from './testConfig'
import './App.css'

function App() {
  const [config, setConfig] = useState(TEST_CONFIG)
  const { words, wordsPerRound, wordDurationSeconds, restDurationSeconds, holdDurationMilliseconds, environments } = config
  const [sessionEnvironments, setSessionEnvironments] = useState(environments)
  const activeEnvironments = sessionEnvironments
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
  const [setupError, setSetupError] = useState('')
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [sessionMathProblems, setSessionMathProblems] = useState([])
  const [mathAnswer, setMathAnswer] = useState('')
  const [mathSubmitted, setMathSubmitted] = useState(false)
  const audioRef = useRef(null)
  const holdIntervalRef = useRef(null)
  const sessionWordsRef = useRef([])
  const environment = activeEnvironments[environmentIndex]
  const currentMathProblem = sessionMathProblems[environmentIndex]
  const cleanWords = useMemo(() => {
    const uniqueWords = new Map()
    words.forEach((word) => {
      const trimmed = word.trim()
      const key = trimmed.toLowerCase().replace(/\s+/g, '')
      if (trimmed && !uniqueWords.has(key)) uniqueWords.set(key, trimmed)
    })
    return [...uniqueWords.values()]
  }, [words])
  const requiredWordCount = activeEnvironments.length * activeWordsPerRound

  useEffect(() => {
    fetch(TEST_CONFIG.resultsEndpoint)
      .then((response) => response.json())
      .then((remote) => {
        const remoteConfig = remote.config || {}
        setConfig((current) => ({
          ...current,
          words: Array.isArray(remote.words) ? remote.words : current.words,
          mathProblems: Array.isArray(remote.mathProblems) ? remote.mathProblems : current.mathProblems,
          wordsPerRound: Number(remoteConfig.wordsPerRound) || current.wordsPerRound,
          wordDurationSeconds: Number(remoteConfig.wordDurationSeconds) || current.wordDurationSeconds,
          restDurationSeconds: Number(remoteConfig.restDurationSeconds) || current.restDurationSeconds,
          holdDurationMilliseconds: Number(remoteConfig.holdDurationMilliseconds) || current.holdDurationMilliseconds,
        }))
      })
      .catch(() => {})
      .finally(() => setIsDataLoading(false))
  }, [])

  useEffect(() => {
    if (!['present', 'rest'].includes(phase)) return undefined
    const timer = window.setTimeout(() => {
      if (timeLeft > 0.1) {
        setTimeLeft(Math.round((timeLeft - 0.1) * 10) / 10)
        return
      }

      if (phase === 'present' && wordIndex + 1 < roundWords.length) {
        setWordIndex((value) => value + 1)
        setTimeLeft(wordDurationSeconds)
      } else if (phase === 'present') {
        setTimeLeft(activeRestDuration)
        setPhase('rest')
      } else {
        setTimeLeft(0)
        setPhase('recall')
      }
    }, 100)
    return () => window.clearTimeout(timer)
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
    if (phase === 'present' || phase === 'rest' || phase === 'recall') {
      audioRef.current.play().catch(() => {})
    } else {
      audioRef.current.pause()
    }
  }, [phase, environment.bgm])

  const shuffleItems = (source) => {
    const shuffled = [...source]
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1))
      ;[shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]]
    }
    return shuffled
  }

  const beginRound = (index = environmentIndex) => {
    const startIndex = index * activeWordsPerRound
    const selectedWords = sessionWordsRef.current.slice(startIndex, startIndex + activeWordsPerRound)
    setEnvironmentIndex(index)
    setRoundWords(selectedWords)
    setWordIndex(0)
    setTimeLeft(wordDurationSeconds)
    setAnswers([])
    setAnswer('')
    setMathAnswer('')
    setMathSubmitted(false)
    setPhase('present')
  }

  const startTest = () => {
    if (cleanWords.length < requiredWordCount) {
      setSetupError(`중복되지 않는 단어가 ${requiredWordCount}개 필요합니다. Words 시트에 ${requiredWordCount - cleanWords.length}개 이상 추가해 주세요.`)
      return
    }
    const availableMathProblems = Array.isArray(config.mathProblems)
      ? config.mathProblems.filter(({ question, answer: expectedAnswer }) => question && expectedAnswer)
      : []
    if (!availableMathProblems.length) {
      setSetupError('Math 시트에 산수 문제와 답을 한 개 이상 입력해 주세요.')
      return
    }
    setSetupError('')
    sessionWordsRef.current = shuffleItems(cleanWords).slice(0, requiredWordCount)
    setSessionEnvironments(shuffleItems(environments))
    const shuffledMathProblems = shuffleItems(availableMathProblems)
    setSessionMathProblems(
      Array.from(
        { length: environments.length },
        (_, index) => shuffledMathProblems[index % shuffledMathProblems.length],
      ),
    )
    beginRound(0)
  }

  const submitMathAnswer = (event) => {
    event.preventDefault()
    if (!mathAnswer.trim()) return
    setMathSubmitted(true)
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
  const totalPresented = roundResults.reduce((sum, result) => sum + result.presented, 0)
  const holdDurationSeconds = holdDurationMilliseconds / 1000

  return (
    <main className="app-shell">
      <audio ref={audioRef} />
      <header className="app-header">
        <div><h1>Free Recall Test</h1><p className="subtitle">단어를 기억하고, 자유롭게 떠올려 보세요.</p></div>
      </header>

      {phase === 'setup' && <section className="panel setup-panel">
        <div className="section-heading"><span className="step">01</span><div><h2>단어 자유 연상 검사</h2><p>{activeEnvironments.length}개 환경을 무작위 순서로 진행합니다.</p></div></div>
        <div className="test-notice" role="note">
          <strong>검사 전 안내</strong>
          <p>조용한 환경에서 시행해주세요.</p>
          <p>가능하다면 이어폰을 착용하시고 노이즈 캔슬링 기능을 사용해 주세요. 동일한 음량을 유지해주세요.</p>
        </div>
        <div className="sequence">{environments.map((item) => <div className="sequence-item" key={item.id}><span className="environment-dot" style={{ backgroundColor: item.color }} /><span>{item.name}</span></div>)}</div>
        <p className="config-note">중복 없는 단어 {cleanWords.length}개 중 환경마다 {activeWordsPerRound}개가 무작위로 제시됩니다. 전체 검사에는 {requiredWordCount}개가 필요합니다.</p>
        {setupError && <p className="setup-error" role="alert">{setupError}</p>}
        <button className="primary-button" onClick={startTest} disabled={isDataLoading || !cleanWords.length}>{isDataLoading ? '데이터 로드 중...' : <>검사 시작하기 <span>→</span></>}</button>
      </section>}

      {phase === 'present' && <section className="test-stage"><p className="stage-label">{environment.name} · {wordIndex + 1} / {roundWords.length}</p><div className="word-card"><span>{roundWords[wordIndex]}</span></div><div className="progress-track"><div className="progress-fill" key={`${environmentIndex}-${wordIndex}`} style={{ '--duration': `${wordDurationSeconds}s` }} /></div><p className="countdown">{timeLeft.toFixed(1)}초 동안 기억하세요</p></section>}

      {phase === 'rest' && <section className="test-stage"><p className="stage-label">산수 문제를 풀어주세요</p><div className="rest-card math-card"><strong className="rest-countdown">{Math.ceil(timeLeft)}</strong>{currentMathProblem ? <><p className="math-question">{currentMathProblem.question}</p><form className="math-form" onSubmit={submitMathAnswer}><input autoFocus inputMode="numeric" value={mathAnswer} onChange={(event) => setMathAnswer(event.target.value)} disabled={mathSubmitted} aria-label="산수 문제 답" placeholder="답 입력" /><button type="submit" disabled={mathSubmitted || !mathAnswer.trim()}>{mathSubmitted ? '입력됨' : '입력'}</button></form>{mathSubmitted && <p className="math-status">답이 입력되었습니다.</p>}</> : <span>산수 문제를 불러오지 못했습니다.</span>}</div><div className="progress-track"><div className="progress-fill rest-fill" key={`rest-${environmentIndex}`} style={{ '--duration': `${activeRestDuration}s` }} /></div></section>}

      {phase === 'recall' && <section className="panel recall-panel"><p className="stage-label">기억나는 단어를 하나씩 입력하세요</p><h2>{environment.name}</h2><form onSubmit={submitAnswer} className="answer-form"><input autoFocus disabled={answers.length >= roundWords.length} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder={answers.length >= roundWords.length ? '제시된 단어 수만큼 입력했습니다' : '단어를 입력하고 Enter'} /><button type="submit" disabled={answers.length >= roundWords.length}>추가</button></form><div className="answer-chips">{answers.map((item, index) => <span className="answer-chip" key={`${item}-${index}`}><span>{item}</span><button type="button" onClick={() => removeAnswer(index)} aria-label={`${item} 삭제`}>×</button></span>)}</div><button className="primary-button hold-button" onPointerDown={startHold} onPointerUp={cancelHold} onPointerLeave={cancelHold} onPointerCancel={cancelHold} aria-label={`모든 단어 입력 후 종료를 위해 ${holdDurationSeconds}초간 누르세요`}><span className="hold-fill" style={{ transform: `scaleX(${holdProgress})` }} /><span className="hold-label">{isHolding ? `모든 단어 입력 후 종료를 위해 ${holdDurationSeconds}초간 누르세요` : `입력 완료 (${answers.length}개)`}</span><span className="hold-arrow">→</span></button></section>}

      {phase === 'results' && <section className="panel results-panel"><p className="eyebrow">{environmentIndex + 1} / {activeEnvironments.length} ROUND COMPLETE</p><h2>라운드 결과</h2><div className="score"><strong>{latest?.correct ?? 0}</strong><span>/ {latest?.presented ?? 0}개 정답</span></div><p>제시 단어 기준 정답률: <b>{latest?.presented ? Math.round((latest.correct / latest.presented) * 100) : 0}%</b></p><p className="sub-result">입력 단어: {latest?.total ?? 0}개 · 입력 기준 정답률: {latest?.total ? Math.round((latest.correct / latest.total) * 100) : 0}%</p>{roundResults.length === activeEnvironments.length && <div className="summary"><h3>종합 결과</h3>{roundResults.map((result) => <p key={result.environment}><span>{result.environment}</span><b>{result.correct} / {result.presented}</b></p>)}<p className="summary-total"><span>전체</span><b>{totalCorrect} / {totalPresented}</b></p><button className="survey-button" onClick={openSurvey}>설문하기 <span>↗</span></button></div>}{environmentIndex + 1 < activeEnvironments.length && <button className="primary-button next-button" onClick={nextEnvironment}>다음 환경 <span>→</span></button>}</section>}
      <footer><span>Free Recall Test</span><span>Round {Math.min(environmentIndex + 1, activeEnvironments.length)} / {activeEnvironments.length}</span></footer>
    </main>
  )
}

export default App
