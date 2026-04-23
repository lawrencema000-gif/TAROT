// Sprint 5 — Community feed + Whispering Well i18n seed.
// UI chrome in all 4 locales.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES = ['en', 'ja', 'ko', 'zh'];

const COMMUNITY = {
  en: {
    title: 'Community',
    postButton: 'Post',
    whisperButton: 'Whisper',
    newPost: 'New post',
    topicLabel: 'Topic',
    placeholder: 'Share a reading, a thought, a question...',
    postAnonymously: 'Post anonymously',
    send: 'Post',
    posting: 'Posting...',
    posted: 'Posted',
    postFailed: 'Could not post',
    contentTooLong: 'Post is too long (max 2000)',
    contentDisallowed: 'That phrase is not allowed',
    contentEmpty: 'Write something first',
    anonymous: 'Anonymous seeker',
    loadFailed: 'Could not load feed',
    empty: 'No posts here yet. Be the first.',
    signInFirst: 'Sign in to react',
    signInToPost: 'Sign in to post, react, and comment.',
    reactFailed: 'Could not react',
    reported: 'Report submitted. Thank you.',
    reportFailed: 'Could not submit report',
    report: 'Report',
    reportPostTitle: 'Report post',
    blockUser: 'Block user',
    blocked: 'User blocked',
    blockFailed: 'Could not block',
    back: 'Back to feed',
    backToFeed: 'Back to feed',
    commentsHeading: 'Comments',
    noComments: 'No comments yet. Be the first to respond.',
    commentPlaceholder: 'Write a response...',
    commentAnonymously: 'Comment anonymously',
    commentFailed: 'Could not post comment',
    topics: { all: 'All', general: 'General', tarot: 'Tarot', astrology: 'Astrology', moon: 'Moon', love: 'Love', shadow: 'Shadow', career: 'Career', wellness: 'Wellness' },
    reportReasons: { spam: 'Spam', harassment: 'Harassment', 'self-harm': 'Self-harm content', explicit: 'Explicit / inappropriate', misinformation: 'Misinformation', other: 'Other' },
    whisperingWell: {
      title: 'Whispering Well',
      intro: 'A quiet place to whisper the unsayable. All posts are anonymous. Respect for each other is the rule. If something needs help, say so clearly — someone is listening.',
      newWhisper: 'Whisper into the well',
      placeholder: 'What needs to be said but has no audience?',
      send: 'Send whisper',
      empty: 'The well is quiet. Be the first to whisper.',
    },
  },
  ja: {
    title: 'コミュニティ',
    postButton: '投稿',
    whisperButton: 'ささやく',
    newPost: '新しい投稿',
    topicLabel: 'トピック',
    placeholder: 'リーディング、思い、問い、なんでも。',
    postAnonymously: '匿名で投稿',
    send: '投稿する',
    posting: '投稿中……',
    posted: '投稿しました',
    postFailed: '投稿できませんでした',
    contentTooLong: '長すぎます（最大2000文字）',
    contentDisallowed: 'この表現は使えません',
    contentEmpty: 'まず何か書いてください',
    anonymous: '名のないもとめ手',
    loadFailed: 'フィードを読み込めませんでした',
    empty: 'まだ投稿がありません。最初のひとりになってください。',
    signInFirst: 'リアクションにはサインインが必要です',
    signInToPost: '投稿・リアクション・コメントにはサインインが必要です。',
    reactFailed: 'リアクションできませんでした',
    reported: '通報を受け付けました。ありがとうございます。',
    reportFailed: '通報できませんでした',
    report: '通報',
    reportPostTitle: '投稿を通報',
    blockUser: 'ユーザーをブロック',
    blocked: 'ブロックしました',
    blockFailed: 'ブロックできませんでした',
    back: 'フィードに戻る',
    backToFeed: 'フィードに戻る',
    commentsHeading: 'コメント',
    noComments: 'まだコメントがありません。最初の返答をどうぞ。',
    commentPlaceholder: '返答を書く……',
    commentAnonymously: '匿名でコメント',
    commentFailed: 'コメントできませんでした',
    topics: { all: 'すべて', general: 'ぜんぱん', tarot: 'タロット', astrology: '占星術', moon: '月', love: '愛', shadow: 'シャドウ', career: 'キャリア', wellness: 'ウェルネス' },
    reportReasons: { spam: 'スパム', harassment: 'ハラスメント', 'self-harm': '自傷に関する内容', explicit: '露骨／不適切', misinformation: '誤情報', other: 'その他' },
    whisperingWell: {
      title: 'ささやきの井戸',
      intro: '言葉にならないことをそっと落とす静かな場所。すべての投稿は匿名です。互いへの敬意が唯一のルール。助けが必要なら、はっきり言ってください——誰かが聴いています。',
      newWhisper: '井戸にささやく',
      placeholder: '言うべきなのに、聴き手のいない言葉は？',
      send: 'ささやきを送る',
      empty: '井戸は静かです。最初のささやきをどうぞ。',
    },
  },
  ko: {
    title: '커뮤니티',
    postButton: '게시',
    whisperButton: '속삭이기',
    newPost: '새 게시물',
    topicLabel: '주제',
    placeholder: '리딩, 생각, 질문 — 무엇이든.',
    postAnonymously: '익명으로 게시',
    send: '게시',
    posting: '게시 중…',
    posted: '게시됨',
    postFailed: '게시할 수 없었어요',
    contentTooLong: '너무 길어요 (최대 2000자)',
    contentDisallowed: '그 표현은 사용할 수 없어요',
    contentEmpty: '먼저 무언가 써 주세요',
    anonymous: '이름 없는 구도자',
    loadFailed: '피드를 불러올 수 없었어요',
    empty: '아직 게시물이 없어요. 첫 번째가 되어 보세요.',
    signInFirst: '반응하려면 로그인이 필요합니다',
    signInToPost: '게시, 반응, 댓글을 위해 로그인해 주세요.',
    reactFailed: '반응할 수 없었어요',
    reported: '신고가 접수됐어요. 감사합니다.',
    reportFailed: '신고할 수 없었어요',
    report: '신고',
    reportPostTitle: '게시물 신고',
    blockUser: '사용자 차단',
    blocked: '차단했어요',
    blockFailed: '차단할 수 없었어요',
    back: '피드로 돌아가기',
    backToFeed: '피드로 돌아가기',
    commentsHeading: '댓글',
    noComments: '아직 댓글이 없어요. 첫 응답을 남겨보세요.',
    commentPlaceholder: '응답 작성…',
    commentAnonymously: '익명으로 댓글',
    commentFailed: '댓글을 달 수 없었어요',
    topics: { all: '전체', general: '일반', tarot: '타로', astrology: '점성술', moon: '달', love: '사랑', shadow: '그림자', career: '커리어', wellness: '웰니스' },
    reportReasons: { spam: '스팸', harassment: '괴롭힘', 'self-harm': '자해 관련', explicit: '노골적/부적절', misinformation: '허위 정보', other: '기타' },
    whisperingWell: {
      title: '속삭이는 우물',
      intro: '말로 할 수 없는 것을 조용히 던질 수 있는 자리. 모든 게시물은 익명입니다. 서로에 대한 존중이 유일한 규칙이에요. 도움이 필요하면 분명히 말해 주세요 — 누군가 듣고 있습니다.',
      newWhisper: '우물에 속삭이기',
      placeholder: '말해야 하지만 들을 곳이 없는 말은?',
      send: '속삭임 보내기',
      empty: '우물은 조용해요. 첫 속삭임을 남겨 보세요.',
    },
  },
  zh: {
    title: '社区',
    postButton: '发布',
    whisperButton: '悄悄话',
    newPost: '新帖',
    topicLabel: '话题',
    placeholder: '分享一次读牌、一个念头、一个问题……',
    postAnonymously: '以匿名发布',
    send: '发布',
    posting: '发布中…',
    posted: '已发布',
    postFailed: '发布失败',
    contentTooLong: '太长了（上限 2000 字）',
    contentDisallowed: '这一短语不被允许',
    contentEmpty: '请先写一点',
    anonymous: '无名的寻路人',
    loadFailed: '无法加载动态',
    empty: '这里还没有帖子，做第一个吧。',
    signInFirst: '需要登录才能反应',
    signInToPost: '登录后即可发布、反应、评论。',
    reactFailed: '无法完成反应',
    reported: '举报已提交，感谢。',
    reportFailed: '举报提交失败',
    report: '举报',
    reportPostTitle: '举报此帖',
    blockUser: '屏蔽用户',
    blocked: '已屏蔽',
    blockFailed: '无法屏蔽',
    back: '返回动态',
    backToFeed: '返回动态',
    commentsHeading: '评论',
    noComments: '还没有评论，第一个回应吧。',
    commentPlaceholder: '写下回应…',
    commentAnonymously: '匿名评论',
    commentFailed: '无法发表评论',
    topics: { all: '全部', general: '日常', tarot: '塔罗', astrology: '占星', moon: '月相', love: '爱情', shadow: '阴影', career: '事业', wellness: '身心' },
    reportReasons: { spam: '垃圾信息', harassment: '骚扰', 'self-harm': '涉及自伤', explicit: '露骨／不当', misinformation: '虚假信息', other: '其他' },
    whisperingWell: {
      title: '低语之井',
      intro: '一个安静的地方，把难以开口的话轻轻放下。所有发布皆为匿名。彼此尊重是唯一的规则。若需要帮助，请清楚说出来——有人在听。',
      newWhisper: '向井中低语',
      placeholder: '必须说出口，却没有听众的话是什么？',
      send: '送出低语',
      empty: '井是安静的，先留一段低语吧。',
    },
  },
};

const NAV_LABELS = {
  en: { community: 'Community', whisperingWell: 'Whispering Well' },
  ja: { community: 'コミュニティ', whisperingWell: 'ささやきの井戸' },
  ko: { community: '커뮤니티', whisperingWell: '속삭이는 우물' },
  zh: { community: '社区', whisperingWell: '低语之井' },
};

const COMMON = {
  en: { loading: 'Loading…', cancel: 'Cancel' },
  ja: { loading: '読み込み中……', cancel: 'キャンセル' },
  ko: { loading: '불러오는 중…', cancel: '취소' },
  zh: { loading: '加载中…', cancel: '取消' },
};

for (const locale of LOCALES) {
  const path = resolve(__dirname, `../src/i18n/locales/${locale}/app.json`);
  const data = JSON.parse(readFileSync(path, 'utf8'));

  data.community = COMMUNITY[locale];

  // Nav labels live under common:nav.*
  const commonPath = resolve(__dirname, `../src/i18n/locales/${locale}/common.json`);
  const common = JSON.parse(readFileSync(commonPath, 'utf8'));
  if (!common.nav) common.nav = {};
  common.nav.community = NAV_LABELS[locale].community;
  common.nav.whisperingWell = NAV_LABELS[locale].whisperingWell;
  writeFileSync(commonPath, JSON.stringify(common, null, 2) + '\n', 'utf8');

  // Common shared strings (loading, cancel)
  if (!data.common) data.common = {};
  Object.assign(data.common, COMMON[locale]);

  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`✓ ${locale}: merged community + nav + common`);
}
