// 검사 운영자가 프로젝트에서 수정하는 설정 파일입니다.
// BGM 파일은 public/audio 폴더에 넣고 '/audio/파일명.mp3'처럼 경로를 적으세요.
export const TEST_CONFIG = {
  // 개발 중 빠른 테스트용. true면 테마별 1문항·1초 휴식. 배포 전 false로 바꾸세요.
  debug: false,
  // 결과 저장용 Google Sheets 주소
  googleSheetsUrl: 'https://docs.google.com/spreadsheets/d/130ySxByz7rRNyRaNsbst1NQRfQqQ-o7clfXh7RUpcnI/edit?usp=sharing',
  // Apps Script 웹 앱 배포 후 받은 /exec 주소를 여기에 입력하세요.
  resultsEndpoint: 'https://script.google.com/macros/s/AKfycbwHMqjKAOalwMo_Sznii4kAIkGZpldsjAVrsehv5cuqVP6q33DMjE42nTvs-OAa9dkd/exec',
  // 결과 ID를 받을 Google Form 링크와 단답형 질문의 entry ID
  surveyUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSfFXaAHkEQokXNSTHr-RObPawuuPA_hBRIPmDYRzBZ358XpHg/viewform',
  surveyEntryId: '527238351',
  // 단어와 시간 설정은 Google Sheets의 Words/Config에서 불러옵니다.
  words: [],
  wordsPerRound: 0,
  wordDurationSeconds: 0,
  restDurationSeconds: 0,
  holdDurationMilliseconds: 500,
  environments: [
    { id: 'silent', name: '무소음 환경', color: '#ef8354', bgm: '' },
    { id: 'white-noise', name: '백색소음 (도서관)', color: '#3d8b8b', bgm: '/audio/white_noise.mp3' },
    { id: 'korean', name: '가사 있는 노래 (한국어)', color: '#7567d9', bgm: '/audio/korean_song.mp3' },
    { id: 'foreign', name: '가사 있는 노래 (외국어)', color: '#d15c88', bgm: '/audio/foreign_song.mp3' },
  ],
}
