type LegalSection = {
  title: string;
  body: string[];
};

export type LegalPageKey = "terms" | "privacy" | "dataPolicy" | "support" | "legal" | "security";

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
const lastUpdated = "2026年7月14日";
const publicEmailAddresses = ["info@gugumo.jp", "support@gugumo.jp"] as const;

const legalNavigation = [
  { key: "terms", label: "利用規約", href: "/terms" },
  { key: "privacy", label: "プライバシーポリシー", href: "/privacy" },
  { key: "dataPolicy", label: "データ取扱方針", href: "/data-policy" },
  { key: "support", label: "サポート", href: "/support" },
  { key: "legal", label: "特定商取引法に基づく表記", href: "/legal" },
  { key: "security", label: "セキュリティ", href: "/security" },
] satisfies Array<{ key: LegalPageKey; label: string; href: string }>;

function renderLegalText(text: string) {
  const email = publicEmailAddresses.find((candidate) => text.includes(candidate));

  if (!email) return text;

  const [before, after] = text.split(email);

  return (
    <>
      {before}
      <a className="legal-inline-link" href={`mailto:${email}`}>{email}</a>
      {after}
    </>
  );
}

export const legalPages = {
  terms: {
    title: "利用規約",
    description: "GUGUMOを安心してご利用いただくための、サービス利用条件に関する案内です。",
    sections: [
      {
        title: "サービスの内容と利用",
        body: [
          "GUGUMOは、不動産会社のSUUMO運用を支援するSUUMO掲載最適化ツールです。利用者が正当な権限に基づいて取得したSUUMO由来CSVをアップロードすると、掲載状況、週次・月次の推移、掲載品質、入替候補およびオプション利用状況を分析・可視化し、掲載運用の判断を支援します。",
          "GUGUMOはCSVを生成するサービスではなく、アップロードされたCSVの内容をもとに分析します。GUGUMOがSUUMOの掲載内容またはオプションを自動的に変更することはありません。",
          "GUGUMOは、株式会社リクルートが提供するSUUMOの公式サービスまたは提携サービスではありません。",
          "利用者は、所属法人の業務目的の範囲で、アップロードする権限を有するデータのみを本サービスで利用するものとします。",
        ],
      },
      {
        title: "CSVと外部サービスの影響",
        body: [
          "分析結果は、利用者がアップロードしたCSVの内容に依存します。CSVの正確性、完全性および最新性は、利用者の管理範囲となります。",
          "SUUMO側の仕様変更、CSV形式の変更、提供停止その他の外部事情により、本サービスの全部または一部へ影響が生じる場合があります。",
        ],
      },
      {
        title: "禁止事項",
        body: prohibitedItems,
      },
      {
        title: "分析結果と効果に関する免責",
        body: [
          "分析結果およびオプションの付け外し・入替による費用対効果額は、掲載運用上の判断材料です。GUGUMOは、反響、成約、売上、利益または費用削減を保証しません。",
          "掲載内容やオプションの変更を含む最終的な判断と実施は、利用者の判断と責任で行うものとします。",
        ],
      },
      {
        title: "個別契約条件",
        body: [
          "利用料金、契約期間、更新、解約、返金その他の条件は、個別契約条件に定めます。個別契約条件と本規約が異なる場合は、個別契約条件を優先します。",
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
          "サービス提供、本人確認、会社・ワークスペースごとのデータ管理、分析結果の生成、サービスの安定運用および問い合わせ対応のために利用します。",
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
      {
        title: "業務の委託",
        body: [
          "サービス提供に必要な範囲で、クラウド、認証、メール配信その他の業務を外部事業者へ委託する場合があります。委託先は必要かつ適切な範囲で選定・管理します。",
        ],
      },
      {
        title: "開示等のご相談",
        body: [
          "保有個人データに関する開示、訂正、利用停止、削除その他のご相談は、info@gugumo.jpまでご連絡ください。",
          "ご相談への対応にあたり本人確認をお願いする場合があります。また、法令上対応できない場合があります。",
        ],
      },
      {
        title: "お問い合わせ窓口",
        body: [
          "本方針および個人情報の取扱いに関するお問い合わせは、info@gugumo.jpまでご連絡ください。",
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
          "GUGUMOは、利用者が正当な権限に基づいて取得し、自らアップロードしたSUUMO由来CSVを分析対象とします。利用者は、アップロードする権限を有するデータのみを使用してください。",
          "GUGUMOはCSVを生成せず、利用者がアップロードしたCSVの内容をもとに掲載運用の確認ポイントを整理します。",
        ],
      },
      {
        title: "利用範囲と管理単位",
        body: [
          "アップロードされたデータは、サービス提供、分析結果の表示、安定運用および問い合わせ対応に必要な範囲で取り扱います。利用者データをこれらの目的と無関係に利用するものではありません。",
          "お客様の掲載データや分析結果を、法令上必要な場合を除き、第三者へ無断で提供しません。",
          "データは会社・ワークスペース単位で管理し、owner、admin、member、viewerのロールに応じて操作を制限します。viewerはCSVを書き込めません。",
        ],
      },
      {
        title: "履歴の管理と削除",
        body: [
          "アップロード履歴の除外、再有効化および除外済みデータの完全削除は、ownerまたはadminが行えます。memberおよびviewerはこれらの操作を行えません。",
          "データの保存期間、契約終了後の取扱い、削除依頼および削除完了時期は、契約条件および運用方針に従います。",
        ],
      },
      {
        title: "データに関するお問い合わせ",
        body: [
          "一般的なデータ取扱いに関するお問い合わせは、info@gugumo.jpまでご連絡ください。",
          "ご利用中のデータ操作、アップロード履歴または削除に関するご相談は、support@gugumo.jpまでご連絡ください。",
        ],
      },
    ],
  },
  support: {
    title: "サポート・お問い合わせ",
    description: "GUGUMOの導入相談、操作相談、契約に関するお問い合わせ窓口の案内です。",
    sections: [
      {
        title: "導入相談・一般お問い合わせ",
        body: [
          "サービス内容、導入条件、契約前のご相談、料金または見積もりに関するお問い合わせは、info@gugumo.jpまでご連絡ください。",
        ],
      },
      {
        title: "ご利用中のお客様",
        body: [
          "操作方法、不具合、アカウント、CSVアップロード、データ・履歴、ログインまたはパスワードに関するご相談は、support@gugumo.jpまでご連絡ください。",
          "お問い合わせ時は、会社名、担当者名および確認したい内容をお知らせください。パスワードや認証コードなどの秘密情報は送信しないでください。",
        ],
      },
      {
        title: "回答時期",
        body: [
          "回答時期は、お問い合わせ内容および契約上のサポート条件により異なります。",
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
          "メールアドレス：info@gugumo.jp",
          "所在地および電話番号は、契約時またはお問い合わせ時に個別に案内します。",
        ],
      },
      {
        title: "販売価格等",
        body: [
          "販売価格、消費税、初期費用その他の料金は、申込書、見積書、契約書その他の個別書面に表示します。",
          "支払時期および支払方法は、個別契約条件に定めます。",
        ],
      },
      {
        title: "提供時期",
        body: [
          "契約成立後、個別契約条件に定める時期から提供を開始します。",
        ],
      },
      {
        title: "契約期間・解約・返金",
        body: [
          "契約期間、更新、解約申出、中途解約、日割りおよび返金に関する条件は、個別契約条件に定めます。",
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
          "計測ツールを導入する場合は、実際の送信先、送信内容および利用目的に合わせて本方針を更新します。",
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
          "GUGUMOは、アカウント認証と、会社・ワークスペース単位のデータ管理を実装しています。",
          "owner、admin、member、viewerのロール別に権限を管理し、viewerのCSV書き込みを制限しています。アップロード履歴の除外、再有効化および除外済みデータの完全削除はownerまたはadminに限定しています。",
          "自テナント以外のデータへアクセスできないよう制御し、通常のアプリ処理ではService Roleを使用しない設計としています。",
          "これらの対策は、あらゆる事故や不正アクセスを完全に防止することを保証するものではありません。",
        ],
      },
      {
        title: "禁止事項",
        body: prohibitedItems,
      },
      {
        title: "インシデント対応",
        body: [
          "情報漏えい、不正アクセス、誤設定などが疑われる場合は、support@gugumo.jpまでご連絡ください。状況を確認し、必要な調査と是正を行います。",
          "一般的な法務または個人情報の取扱いに関するお問い合わせは、info@gugumo.jpまでご連絡ください。",
        ],
      },
    ],
  },
} satisfies Record<string, LegalPageContent>;

export function LegalPage({
  content,
  currentPage,
}: {
  content: LegalPageContent;
  currentPage?: LegalPageKey;
}) {
  return (
    <main className="legal-page min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <article className="mx-auto max-w-4xl">
        <header className="legal-header">
          <div>
            <a className="legal-brand-link" href="https://gugumo.jp" aria-label="GUGUMO公式HPへ移動">
              GUGUMO
            </a>
            <p className="mt-1 text-sm font-semibold text-slate-500">法務・サポート案内</p>
          </div>
          <a className="legal-app-link" href="https://app.gugumo.jp">アプリに戻る</a>
        </header>

        <nav className="legal-navigation" aria-label="法務・サポートページ">
          <a className="legal-nav-link external" href="https://gugumo.jp">GUGUMO公式HP</a>
          {legalNavigation.map((item) => (
            <a
              className="legal-nav-link"
              href={item.href}
              key={item.key}
              aria-current={currentPage === item.key ? "page" : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <p className="text-sm font-semibold text-slate-500">GUGUMO 法務案内</p>
        <h1 className="mt-3 text-3xl font-bold">{content.title}</h1>
        <p className="mt-4 text-base leading-7 text-slate-700">{content.description}</p>
        <p className="mt-3 text-sm text-slate-500">最終更新日：{lastUpdated}</p>
        <p className="mt-4 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          利用料金、契約期間、更新、解約、返金その他の条件は、申込書、見積書、契約書その他の個別契約条件に定めます。
        </p>

        <div className="mt-10 space-y-8">
          {content.sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-semibold">{section.title}</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                {section.body.map((item) => (
                  <li key={item}>・{renderLegalText(item)}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <footer className="legal-footer">
          <p>運営者：{operatorName}</p>
          <p>
            一般・法務・個人情報：<a className="legal-inline-link" href="mailto:info@gugumo.jp">info@gugumo.jp</a>
            <span aria-hidden="true"> ／ </span>
            利用中のサポート：<a className="legal-inline-link" href="mailto:support@gugumo.jp">support@gugumo.jp</a>
          </p>
        </footer>
      </article>
    </main>
  );
}
