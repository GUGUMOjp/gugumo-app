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

const operatorName = "GUGUMO 代表 田中 純一";

export const legalPages = {
  terms: {
    title: "利用規約",
    description: "GUGUMOを安心してご利用いただくための、サービス利用条件に関する案内です。",
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
          "本サービスの分析結果は、掲載運用の判断材料を整理するものであり、反響や成約を保証するものではありません。",
          "正式な契約条件は、個別契約または申込時に提示する条件を優先します。",
        ],
      },
    ],
  },
  privacy: {
    title: "プライバシーポリシー",
    description: "GUGUMOで扱う個人情報・法人情報の取扱い方針に関する案内です。",
    sections: [
      {
        title: "取得する情報",
        body: [
          "アカウント情報、法人情報、CSVアップロード情報、操作履歴など、サービス提供に必要な情報を取得する場合があります。",
          "取得する情報の範囲は、契約内容、利用プラン、実際の利用機能に応じて定めます。",
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
  dataPolicy: {
    title: "データ取扱方針",
    description: "お客様が読み込むCSVデータと分析結果の取扱いに関する案内です。",
    sections: [
      {
        title: "対象データ",
        body: [
          "GUGUMOは、利用者が正当な権限に基づいて取得したSUUMO掲載管理用CSVを分析対象とします。",
          "GUGUMOはCSVを生成せず、利用者が読み込んだCSVの内容をもとに掲載運用の確認ポイントを整理します。",
        ],
      },
      {
        title: "利用範囲",
        body: [
          "読み込まれたデータは、サービス提供、分析結果の表示、問い合わせ対応、品質改善のために必要な範囲で取り扱います。",
          "お客様の掲載データや分析結果を、法令上必要な場合を除き、第三者へ無断で提供しません。",
        ],
      },
      {
        title: "保管と削除",
        body: [
          "データの保管期間、削除方法、バックアップの扱いは、契約時または運用開始時に個別に案内します。",
          "アップロード履歴の除外、復元、完全削除は、権限のある利用者またはGUGUMO担当者の支援により行います。",
          "営業デモや初期確認で取り扱うデータは、必要な範囲に限定します。",
        ],
      },
    ],
  },
  support: {
    title: "サポート・お問い合わせ",
    description: "GUGUMOの導入相談、操作相談、契約に関するお問い合わせ窓口の案内です。",
    sections: [
      {
        title: "お問い合わせ",
        body: [
          "導入前のご相談、初期設定、操作方法、契約内容、請求に関するお問い合わせを受け付けます。",
          "初期導入期間は、導入時または契約時に個別に案内した担当者連絡先をご利用ください。",
          "お問い合わせ時は、会社名、担当者名、確認したい内容をお知らせください。",
        ],
      },
      {
        title: "サポート内容",
        body: [
          "SUUMO CSVの読み込み手順、各分析画面の見方、営業デモ時の説明ポイントを案内します。",
          "お客様の運用状況に応じて、初回利用時の確認や画面説明を個別に行います。",
        ],
      },
      {
        title: "営業時間",
        body: [
          "通常の対応時間は、契約時または導入時に個別に案内します。",
          "営業時間外のお問い合わせは、翌営業日以降に順次確認します。",
        ],
      },
      {
        title: "問い合わせ先",
        body: [
          "正式な問い合わせ先メールアドレス、電話番号、受付時間は契約時またはお問い合わせ時に個別に案内します。",
          "初期顧客向けの導入支援は、契約内容に応じてオンラインまたは個別連絡で対応します。",
        ],
      },
      {
        title: "運営者",
        body: [operatorName],
      },
    ],
  },
  legal: {
    title: "特定商取引法に基づく表記",
    description: "GUGUMOの提供者情報と取引条件に関する案内です。",
    sections: [
      {
        title: "販売事業者",
        body: [
          operatorName,
          "所在地、電話番号、メールアドレスは、契約時またはお問い合わせ時に個別に案内します。",
        ],
      },
      {
        title: "販売価格・支払条件",
        body: [
          "利用料金、支払時期、支払方法は、申込書、見積書、契約書、または個別案内に記載します。",
          "追加費用が発生する場合は、事前に内容と条件を案内します。",
        ],
      },
      {
        title: "提供時期・解約",
        body: [
          "サービス提供開始時期、契約期間、解約条件は、契約時に提示する条件に従います。",
          "デジタルサービスの性質上、提供開始後の返金可否は個別契約条件に基づきます。",
        ],
      },
    ],
  },
  cookie: {
    title: "Cookie / 外部送信ポリシー",
    description: "Cookie、外部送信、計測ツール導入時の確認事項に関する案内です。",
    sections: [
      {
        title: "Cookieの利用",
        body: [
          "認証、セッション管理、セキュリティ維持、利用状況把握のためにCookie等を利用する場合があります。",
          "外部送信を伴う機能を導入する場合は、送信先、送信内容、利用目的を整理して案内します。",
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
          "Cookieの設定や拒否方法は、利用ブラウザの仕様と実装内容に合わせて案内します。",
        ],
      },
    ],
  },
  security: {
    title: "セキュリティ・禁止事項",
    description: "GUGUMOの安全利用、データ分離、禁止行為に関する案内です。",
    sections: [
      {
        title: "セキュリティ方針",
        body: [
          "法人ごとのデータ分離、認証、権限管理、必要に応じた確認を重視して設計します。",
          "他社データへの不正アクセスを防ぐため、データ分離と権限管理を段階的に整備します。",
        ],
      },
      {
        title: "禁止事項",
        body: prohibitedItems,
      },
      {
        title: "インシデント対応",
        body: [
          "情報漏えい、不正アクセス、誤設定などが疑われる場合は、導入時に案内した担当者連絡先を通じて確認し、必要な調査と是正を行います。",
        ],
      },
    ],
  },
} satisfies Record<string, LegalPageContent>;

export function LegalPage({ content }: { content: LegalPageContent }) {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-900">
      <article className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold text-slate-500">GUGUMO 法務案内</p>
        <h1 className="mt-3 text-3xl font-bold">{content.title}</h1>
        <p className="mt-4 text-base leading-7 text-slate-700">{content.description}</p>
        <p className="mt-4 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          正式な契約条件、料金、提供範囲、解約条件は、個別契約または申込時に提示する内容を優先します。
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
        <p className="mt-8 text-xs leading-6 text-slate-500">
          運営者: {operatorName}
        </p>
      </article>
    </main>
  );
}
