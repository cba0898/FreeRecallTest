import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const DEFAULT_WORDS = [
  '사과', '바다', '연필', '기차', '구름', '정원', '시계', '강아지',
  '우산', '음악', '창문', '자전거', '노을', '책상', '여행', '나무',
  '커피', '사진', '달력', '바람',
]

const ENVIRONMENTS = [
  { id: 'silent', name: '무소음 환경', color: '#ef8354' },
  { id: 'white-noise', name: '백색소음 (도서관)', color: '#3d8b8b' },
  { id: 'korean', name: '가사 있는 노래 (한국어)', color: '#7567d9' },
  { id: 'foreign', name: '가사 있는 노래 (외국어)', color: '#d15c88' },
]

function App() {
  const [words, setWords] = useState(DEFAULT_WORDS)
  const [wordCount, setWordCount] = useState(5)
  const [wordDuration, setWordDuration] = useState(2)
  const [restDuration, setRestDuration] = useState(10)
  const [music, setMusic] = useState({})
  const [environmentIndex, setEnvironmentIndex] = useState(0)
  const [phase, setPhase] = useState('setup')
  const [roundWords, setRoundWords] = useState([])
  const [wordIndex, setWordIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [answer, setAnswer] = useState('')
  const [roundResults, setRoundResults] = useState([])
  const [showSettings, setShowSettings] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const audioRef = useRef(null)
  const environment = ENVIRONMENTS[environmentIndex]
  const cleanWords = useMemo(() => words.map((word) => word.trim()).filter(Boolean), [words])

  useEffect(() => {
    if (!['present', 'rest'].includes(phase)) return undefined
    setTimeLeft(phase === 'present' ? wordDuration : restDuration)
    const timer = window.setInterval(() => setTimeLeft((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [phase, wordDuration, restDuration, wordIndex])

  useEffect(() => {
    if (phase === 'present' && timeLeft === 0) {
      if (wordIndex + 1 < roundWords.length) {
        setWordIndex((value) => value + 1)
        setTimeLeft(wordDuration)
      } else {
        setTimeLeft(restDuration)
        setPhase('rest')
      }
    }
    if (phase === 'rest' && timeLeft === 0) setPhase('recall')
  }, [phase, timeLeft, wordIndex, roundWords.length])

  useEffect(() => {
    if (!audioRef.current) return
    if (music[environment.id] && phase !== 'setup' && phase !== 'results') {
      audioRef.current.src = music[environment.id]
      audioRef.current.loop = true
      audioRef.current.play().catch(() => {})
    } else audioRef.current.pause()
    return () => audioRef.current?.pause()
  }, [environment.id, music, phase])

  const beginRound = () => {
    const shuffled = [...cleanWords].sort(() => Math.random() - 0.5)
    setRoundWords(shuffled.slice(0, Math.min(wordCount, shuffled.length)))
    setWordIndex(0)
    setTimeLeft(wordDuration)
    setAnswers([])
    setAnswer('')
    setPhase('present')
  }

  const submitAnswer = (event) => {
    event.preventDefault()
    if (!answer.trim()) return
    setAnswers((current) => [...current, answer.trim()])
    setAnswer('')
  }

  const finishRound = () => {
    const normalize = (value) => value.trim().toLowerCase().replace(/\s+/g, '')
    const correct = answers.filter((value) => roundWords.some((word) => normalize(word) === normalize(value)))
    setRoundResults((current) => [...current, {
      environment: environment.name,
      correct: correct.length,
      total: answers.length,
      date: new Date().toLocaleString(),
    }])
    setPhase('results')
  }

  const handleMusicFile = (event) => {
    const file = event.target.files?.[0]
    if (file) setMusic((current) => ({ ...current, [environment.id]: URL.createObjectURL(file) }))
  }

  const totalCorrect = roundResults.reduce((sum, result) => sum + result.correct, 0)
  const totalAnswers = roundResults.reduce((sum, result) => sum + result.total, 0)

  return (
    <main className="app-shell">
      <audio ref={audioRef} />
      <header className="app-header">
        <div><p className="eyebrow">COGNITIVE TEST</p><h1>Free Recall Test</h1><p className="subtitle">단어를 기억하고, 자유롭게 떠올려 보세요.</p></div>
        <button className="settings-toggle" onClick={() => setShowSettings((value) => !value)}>⚙ 설정</button>
      </header>

      {showSettings && <section className="settings panel">
        <h2>검사 설정</h2>
        <div className="setting-grid">
          <label>제시 단어 수 (M)<input type="number" min="1" value={wordCount} onChange={(e) => setWordCount(Number(e.target.value))} /></label>
          <label>단어 제시 시간 (초)<input type="number" min="1" value={wordDuration} onChange={(e) => setWordDuration(Number(e.target.value))} /></label>
          <label>휴식 시간 (초)<input type="number" min="0" value={restDuration} onChange={(e) => setRestDuration(Number(e.target.value))} /></label>
        </div>
        <label>단어 목록 (줄바꿈 또는 쉼표로 구분)<textarea value={words.join('\n')} onChange={(e) => setWords(e.target.value.split(/[\n,]+/))} rows="5" /></label>
        <p className="hint">현재 {cleanWords.length}개 단어 중 무작위로 {Math.min(wordCount, cleanWords.length)}개를 뽑습니다.</p>
      </section>}

      {phase === 'setup' && <section className="panel setup-panel">
        <div className="section-heading"><span className="step">01</span><div><h2>검사 환경을 선택하세요</h2><p>각 환경을 한 번씩 진행할 수 있습니다.</p></div></div>
        <div className="environment-list">{ENVIRONMENTS.map((item, index) => <button className={`environment-card ${index === environmentIndex ? 'selected' : ''}`} key={item.id} onClick={() => setEnvironmentIndex(index)}>
          <span className="environment-dot" style={{ backgroundColor: item.color }} /><span><strong>{item.name}</strong><small>{music[item.id] ? 'BGM 등록됨' : 'BGM 없음'}</small></span><span className="radio">{index === environmentIndex ? '●' : '○'}</span>
        </button>)}</div>
        <label className="file-label">선택한 환경의 BGM 파일<input type="file" accept="audio/*" onChange={handleMusicFile} /></label>
        <button className="primary-button" onClick={beginRound} disabled={!cleanWords.length}>검사 시작하기 <span>→</span></button>
      </section>}

      {phase === 'present' && <section className="test-stage"><p className="stage-label">{environment.name} · {wordIndex + 1} / {roundWords.length}</p><div className="word-card"><span>{roundWords[wordIndex]}</span></div><div className="progress-track"><div style={{ width: `${(timeLeft / wordDuration) * 100}%` }} /></div><p className="countdown">{timeLeft}초 동안 기억하세요</p></section>}

      {phase === 'rest' && <section className="test-stage"><p className="stage-label">잠시 쉬는 시간</p><div className="rest-card"><span>곧 입력을 시작합니다</span><strong>{timeLeft}</strong></div><div className="progress-track"><div style={{ width: `${(timeLeft / Math.max(restDuration, 1)) * 100}%` }} /></div></section>}

      {phase === 'recall' && <section className="panel recall-panel"><p className="stage-label">기억나는 단어를 하나씩 입력하세요</p><h2>{environment.name}</h2><form onSubmit={submitAnswer} className="answer-form"><input autoFocus value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="단어를 입력하고 Enter" /><button type="submit">추가</button></form><div className="answer-chips">{answers.map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}</div><button className="primary-button" onClick={finishRound}>입력 완료 ({answers.length}개)</button></section>}

      {phase === 'results' && <section className="panel results-panel"><p className="eyebrow">ROUND COMPLETE</p><h2>결과를 확인하세요</h2><div className="score"><strong>{roundResults.at(-1)?.correct ?? 0}</strong><span>/ {roundResults.at(-1)?.total ?? 0} 정답</span></div><p>입력한 단어 기준 정답률: <b>{roundResults.at(-1)?.total ? Math.round((roundResults.at(-1).correct / roundResults.at(-1).total) * 100) : 0}%</b></p><div className="result-actions"><button className="secondary-button" onClick={() => setPhase('setup')}>다음 환경</button><button className="primary-button" onClick={() => { setPhase('setup'); setRoundResults([]) }}>처음으로</button></div>{roundResults.length > 1 && <div className="summary"><h3>종합 결과</h3>{roundResults.map((result) => <p key={result.date}><span>{result.environment}</span><b>{result.correct} / {result.total}</b></p>)}<p className="summary-total"><span>전체</span><b>{totalCorrect} / {totalAnswers}</b></p></div>}</section>}
      <footer><span>Free Recall Test</span><span>Round {Math.min(roundResults.length + 1, 4)} / 4</span></footer>
    </main>
  )
}

export default App
