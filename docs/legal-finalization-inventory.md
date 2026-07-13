# Legal Finalization Inventory

This document inventories current legal-facing pages and decisions needed before formal release. It does not establish final legal text.

Current legal pages are provisional. They must be finalized before any external paid beta starts.

## Current Pages

| Page | Current status | Provisional points | Required decision |
| --- | --- | --- | --- |
| `/terms` 利用規約 | Exists | RC/beta level wording | Final contract alignment |
| `/privacy` プライバシーポリシー | Exists | Needs personal information scope review | Final privacy language |
| `/data-policy` データ取扱方針 | Exists | Needs retention/deletion specifics | Data retention and deletion rules |
| `/support` サポート | Exists | Support hours/contact may be provisional | Support channel and response policy |
| `/legal` 特商法表記 | Exists | Address/phone/email are not fully public | Whether display is legally required for this sales model |
| `/security` セキュリティ | Exists | Needs hosting/provider details review | Security responsibility split |

## Topics Requiring User Decision

- Whether beta customers sign a separate contract before using the service.
- Whether GUGUMO is used as屋号, service name, or both in legal text.
- Individual business name display: `GUGUMO 代表 田中 純一`.
- Whether address/phone/email are shown publicly or only at contract/inquiry.
- Data retention period after cancellation.
- Data deletion request process.
- Whether customer CSV contains personal data.
- How SUUMO and other third-party service relationships are described.
- Provider inventory: Supabase, Vercel, Google Workspace.
- Disclaimer that反響増加 is not guaranteed.
- Formal問い合わせ先.
- Data retention and deletion policy after contract end.
- Whether temporary beta wording should be shown in-app or kept in contract/onboarding documents.

## Public UI Decision

Do not add a visible "暫定" label inside customer-facing legal pages until the publication and paid-beta policy is decided. Showing provisional status to customers can reduce trust and does not replace legal review. Keep the repository inventory explicit and finalize the page text before external paid beta.

## Legal Expert Review Recommended

- Terms and privacy policy final wording.
- 特定商取引法 applicability.
- Data processing and security responsibility split.
- Cancellation and data deletion clauses.
