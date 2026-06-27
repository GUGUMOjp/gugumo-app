type LegalSection = {
  title: string;
  body: string[];
};

export type LegalPageContent = {
  title: string;
  description: string;
  sections: LegalSection[];
};

const prohibitedItems = [
  "無断転載禁止",
  "解析結果の不正利用禁止",
  "逆コンパイル・スクレイピング禁止",
  "第三者提供禁止",
  "他社データへの不正アクセス禁止",
  "法令違反目的での利用禁止",
];

export const legalPages = {
  terms: {
    title: "利用規約",
    description: "GUGUMOの利用条件、禁止事項、責任範囲を整理するための仮文面です。",
    sections: [
      {
        title: "サービス利用",
        body: [
          "GUGUMOは、不動産会社のSUUMO運用を支援するための業務支援サービスです。",
          "利用者は、所属法人の業務目的の範囲で本サービスを利用するものとします。",
        ],
      },
      {
        title: "禁止事項",
        body: prohibitedItems,
      },
      {
        title: "免責",
        body: [
          "本ページは法務レビュー前の仮文面です。",
          "最終公開前に、事業内容、契約形態、運用実態に合わせた専門家確認を行います。",
        ],
      },
    ],
  },
  privacy: {
    title: "プライバシーポリシー",
    description: "GUGUMOで扱う個人情報・法人情報・アップロードデータの取扱い方針の仮文面です。",
    sections: [
      {
        title: "取得する情報",
        body: [
          "アカウント情報、法人情報、CSVアップロード情報、操作履歴など、サービス提供に必要な情報を取得する場合があります。",
          "取得する情報の範囲は、正式版公開前に実際の機能と照合して確定します。",
        ],
      },
      {
        title: "利用目的",
        body: [
          "サービス提供、本人確認、法人ごとのデータ分離、分析結果の生成、品質改善、問い合わせ対応のために利用します。",
          "法令で認められる場合を除き、利用目的を超えて取り扱いません。",
        ],
      },
      {
        title: "第三者提供",
        body: [
          "利用者の同意または法令上の根拠がある場合を除き、取得情報を第三者へ提供しません。",
          "解析結果、CSVデータ、他社データの第三者提供は禁止事項として扱います。",
        ],
      },
    ],
  },
  cookie: {
    title: "Cookie / 外部送信ポリシー",
    description: "Cookie、外部送信、計測ツール導入時の確認事項を整理するための仮文面です。",
    sections: [
      {
        title: "Cookieの利用",
        body: [
          "認証、セッション管理、セキュリティ維持、利用状況把握のためにCookie等を利用する場合があります。",
          "現時点では、このページは将来の外部送信管理のための骨組みです。",
        ],
      },
      {
        title: "外部送信",
        body: [
          "外部サービスへ情報を送信する機能を導入する場合は、送信先、送信内容、利用目的を事前に整理します。",
          "Google Analytics等の計測ツール導入は、本Sprintでは行いません。",
        ],
      },
      {
        title: "利用者の選択",
        body: [
          "Cookieの設定や拒否方法は、正式公開前に利用ブラウザの仕様と実装内容に合わせて記載します。",
        ],
      },
    ],
  },
  security: {
    title: "セキュリティ・禁止事項",
    description: "GUGUMOの安全利用、データ分離、禁止行為を整理するための仮文面です。",
    sections: [
      {
        title: "セキュリティ方針",
        body: [
          "法人ごとのデータ分離、認証、権限管理、監査可能性を重視して設計します。",
          "他社データへの不正アクセスを防ぐため、認証・RLS・Repository層の責務分離を段階的に整備します。",
        ],
      },
      {
        title: "禁止事項",
        body: prohibitedItems,
      },
      {
        title: "インシデント対応",
        body: [
          "情報漏えい、不正アクセス、誤設定などが疑われる場合の連絡・調査・是正フローは、正式運用前に定義します。",
        ],
      },
    ],
  },
} satisfies Record<string, LegalPageContent>;

export function LegalPage({ content }: { content: LegalPageContent }) {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-900">
      <article className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold text-slate-500">GUGUMO Legal</p>
        <h1 className="mt-3 text-3xl font-bold">{content.title}</h1>
        <p className="mt-4 text-base leading-7 text-slate-700">{content.description}</p>
        <p className="mt-4 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          このページは法務ページの骨組みとして作成した仮文面です。最終公開前に専門家確認が必要です。
        </p>

        <div className="mt-10 space-y-8">
          {content.sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-semibold">{section.title}</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                {section.body.map((item) => (
                  <li key={item}>・{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
