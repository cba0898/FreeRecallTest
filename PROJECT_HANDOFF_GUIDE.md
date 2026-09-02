# Free Recall Test 전달·운영 가이드

## 1. 샘플 확인

- 게임 샘플: [https://free-recall-test-two.vercel.app/](https://free-recall-test-two.vercel.app/)
- 데이터 스프레드시트: [https://docs.google.com/spreadsheets/d/130ySxByz7rRNyRaNsbst1NQRfQqQ-o7clfXh7RUpcnI/edit?gid=0#gid=0](https://docs.google.com/spreadsheets/d/130ySxByz7rRNyRaNsbst1NQRfQqQ-o7clfXh7RUpcnI/edit?gid=0#gid=0)

현재 사이트는 기능 확인을 위한 샘플입니다.

## 2. 요청자가 준비해야 하는 것

요청자는 아래 항목을 준비한 뒤 전달해야 합니다.

1. 검사에 사용할 단어 목록
2. 환경별 BGM 파일 또는 직접 재생 가능한 음원
3. 검사 시간 설정
4. 사용할 Google Sheets
5. 사용할 Google Form

### Google Sheets 권한

스프레드시트 소유자는 아래 계정을 **편집자**로 추가해야 합니다.

```text
cba0898@gmail.com
```

단순히 링크를 보내거나 보기 권한만 주면 Config·Words 수정과 Apps Script 설정을 처리할 수 없습니다.

## 3. Google Sheets 탭 구성

### Config 탭

`Config` 탭의 A열과 B열에 설정을 입력합니다. C열은 설명용으로 사용할 수 있습니다.

```text
항목                     값     설명
wordsPerRound            10     환경별 제시 단어 수
wordDurationSeconds      1.5    단어 하나를 보여주는 시간(초)
restDurationSeconds      10     환경 사이 휴식 시간(초)
holdDurationMilliseconds 500    입력 완료 버튼을 누르는 시간(밀리초)
```

### Words 탭

첫 번째 행은 제목으로 두고, 두 번째 행부터 단어를 하나씩 입력합니다.

```text
단어
사과
바다
연필
기차
```

단어를 추가하거나 삭제하면 사이트를 새로고침한 뒤 변경 내용이 반영됩니다. 단어 목록은 프로젝트 파일이 아니라 `Words` 탭에서 관리합니다.

## 4. 시트1에 저장되는 정보

검사 완료 후 첫 번째 시트에는 다음 5개 열만 저장됩니다.

```text
결과 ID
무소음 정답률
백색소음 정답률
한국어 노래 정답률
외국어 노래 정답률
```

정답률은 다음 기준입니다.

```text
정답률 = 정답 수 ÷ 제시된 단어 수 × 100
```

제시 단어 목록과 사용자가 입력한 답변 목록은 시트1에 저장하지 않습니다.

`결과 ID`는 게임 결과와 사용자 설문 응답을 연결하기 위한 식별자입니다. 사용자는 검사 완료 후 `설문하기` 버튼을 눌러 결과 ID가 미리 입력된 설문으로 이동합니다.

## 5. Google Form 준비 방법

Google Form에는 결과 ID를 받을 단답형 질문을 하나 추가합니다.

질문 예시:

```text
결과 코드가 자동으로 입력됩니다.
```

권장 설정:

- 필수 입력: 켜기
- 응답 유효성 검사: 정규 표현식
- 조건: 일치
- 패턴:

```text
FRT-[0-9]{8}-[A-Z0-9]{6}
```

Google Form의 미리 입력 링크에서 `entry.숫자=` 부분의 숫자를 확인하고, 프로젝트의 `src/testConfig.js`에 입력합니다.

```js
surveyEntryId: '527238351',
```

Google Form은 사용자가 미리 입력된 결과 ID를 수정할 수 있으므로, 질문 설명에 자동 입력값을 수정하지 말라는 안내를 표시해야 합니다.

### Google Form 공동작업자 권한

임시 설문을 요청자가 준비하는 경우, 설문 소유자는 다음 계정을 공동작업자로 추가해야 합니다.

```text
cba0898@gmail.com
```

공동작업자 권한이 있어야 다음 작업을 할 수 있습니다.

- 결과 ID 질문 확인·수정
- 정규 표현식 검사 설정
- 미리 입력 링크 확인
- 설문 항목 수정
- 응답 시트 확인



## 6. BGM 관리

BGM은 현재 Google Sheets가 아니라 프로젝트에서 관리합니다.

파일을 다음 폴더에 넣습니다.

```text
public/audio/
```

권장 파일명:

```text
white_noise.mp3
korean_song.mp3
foreign_song.mp3
```

파일 경로는 `src/testConfig.js`의 환경 설정에 연결합니다.

```js
{
  id: 'white-noise',
  name: '백색소음 (도서관)',
  bgm: '/audio/white_noise.mp3',
}
```

SoundCloud·YouTube 페이지 주소는 `<audio>`에서 직접 재생할 수 없습니다. 외부 주소를 사용하는 경우에도 직접 재생 가능한 MP3 주소와 사용 권한이 필요합니다.

## 7. Apps Script 역할

Google Sheets에 연결된 Apps Script는 두 가지 역할을 합니다.

- `doGet()`: Config와 Words 탭의 데이터를 사이트에 전달
- `doPost()`: 검사 완료 후 결과 ID와 환경별 정답률을 시트1에 저장

Apps Script 웹 앱은 다음 권한으로 배포해야 합니다.

- 실행 사용자: 나
- 액세스 권한: 모든 사용자

코드를 수정한 뒤에는 반드시 새 버전으로 재배포해야 합니다.

```text
배포 → 배포 관리 → 수정 → 새 버전 → 배포
```



## 8. 전달 전 확인 목록

- [ ] 요청자가 단어 목록을 `Words` 탭에 입력했는가
- [ ] `Config` 탭의 시간·문항 수가 설정되었는가
- [ ] 정식 운영 시 `debug: false`로 변경했는가
- [ ] BGM 파일 또는 사용 권한이 있는 음원이 준비되었는가
- [ ] Google Sheets에 `cba0898@gmail.com`을 편집자로 추가했는가
- [ ] Google Form에 결과 ID 질문이 있는가
- [ ] Google Form에 `cba0898@gmail.com`을 공동작업자로 추가했는가
- [ ] `surveyEntryId`가 올바른가
- [ ] Apps Script가 새 버전으로 배포되었는가
- [ ] 테스트 결과가 시트1에 저장되는가
- [ ] 설문하기 버튼을 눌렀을 때 결과 ID가 자동 입력되는가