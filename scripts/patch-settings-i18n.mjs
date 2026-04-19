import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, '..', 'src', 'i18n', 'locales');

const additions = {
  en: {
    birthCity: 'Birth City',
    contactSupport: 'Contact Support',
    frequentlyAskedQuestions: 'Frequently Asked Questions',
    faq: {
      accuracyQ: 'How accurate are the readings?',
      cancelQ: 'Can I cancel my subscription?',
      secureQ: 'Is my data secure?',
    },
    defaultLabel: 'Default',
    disclaimerHeader: 'Disclaimer',
    disclaimerBody: 'We collect minimal data. Birth time and location are optional.',
    actionCannotBeUndone: 'This action cannot be undone',
    toasts: {
      exportPartial: 'Some data could not be exported. Please try again.',
      profileUpdated: 'Profile updated',
      profileUpdateFailed: 'Failed to update profile',
      updateFailed: 'Failed to update',
      devModeEnabled: 'Developer mode enabled',
    },
  },
  ja: {
    birthCity: '出生地',
    contactSupport: 'サポートに問い合わせる',
    frequentlyAskedQuestions: 'よくある質問',
    faq: {
      accuracyQ: 'リーディングの精度はどの程度ですか?',
      cancelQ: 'サブスクリプションはキャンセルできますか?',
      secureQ: '私のデータは安全ですか?',
    },
    defaultLabel: 'デフォルト',
    disclaimerHeader: '免責事項',
    disclaimerBody: '最小限のデータのみを収集します。出生時刻と場所は任意です。',
    actionCannotBeUndone: 'この操作は取り消せません',
    toasts: {
      exportPartial: '一部のデータをエクスポートできませんでした。もう一度お試しください。',
      profileUpdated: 'プロフィールを更新しました',
      profileUpdateFailed: 'プロフィールの更新に失敗しました',
      updateFailed: '更新に失敗しました',
      devModeEnabled: '開発者モードを有効にしました',
    },
  },
  ko: {
    birthCity: '출생지',
    contactSupport: '지원 문의',
    frequentlyAskedQuestions: '자주 묻는 질문',
    faq: {
      accuracyQ: '리딩은 얼마나 정확한가요?',
      cancelQ: '구독을 취소할 수 있나요?',
      secureQ: '제 데이터는 안전한가요?',
    },
    defaultLabel: '기본',
    disclaimerHeader: '면책 조항',
    disclaimerBody: '최소한의 데이터만 수집합니다. 출생 시간과 장소는 선택 사항입니다.',
    actionCannotBeUndone: '이 작업은 되돌릴 수 없습니다',
    toasts: {
      exportPartial: '일부 데이터를 내보내지 못했습니다. 다시 시도해 주세요.',
      profileUpdated: '프로필이 업데이트되었습니다',
      profileUpdateFailed: '프로필 업데이트에 실패했습니다',
      updateFailed: '업데이트에 실패했습니다',
      devModeEnabled: '개발자 모드가 활성화되었습니다',
    },
  },
  zh: {
    birthCity: '出生地',
    contactSupport: '联系支持',
    frequentlyAskedQuestions: '常见问题',
    faq: {
      accuracyQ: '解读的准确度如何?',
      cancelQ: '我可以取消订阅吗?',
      secureQ: '我的数据安全吗?',
    },
    defaultLabel: '默认',
    disclaimerHeader: '免责声明',
    disclaimerBody: '我们仅收集最少的数据。出生时间和地点是可选的。',
    actionCannotBeUndone: '此操作无法撤消',
    toasts: {
      exportPartial: '部分数据无法导出。请重试。',
      profileUpdated: '个人资料已更新',
      profileUpdateFailed: '更新个人资料失败',
      updateFailed: '更新失败',
      devModeEnabled: '已启用开发者模式',
    },
  },
};

for (const [lang, block] of Object.entries(additions)) {
  const file = path.join(localesDir, lang, 'app.json');
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  j.settings = { ...j.settings, ...block };
  fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n');
  console.log(`Patched ${lang}/app.json — settings block extended`);
}
