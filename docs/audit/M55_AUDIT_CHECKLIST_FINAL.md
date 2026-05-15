# M55_AUDIT_CHECKLIST_FINAL
Status: FINAL / Gate R Defense
Date: 2026-03-03 (JST)
Goal: Stripe審査中の「Productionを揺らさない」「禁止語彙0」「価格/返金/サポート整合」を機械的に守る。

01. Production（main）で Gate R 対象面を凍結している（通常開発のコミットが入っていない）
02. Production URL が意図どおりで到達できる（例: m55-web.vercel.app）
03. /dtr/lp が常時 200 を返す
04. /legal/tokushoho が常時 200 を返す
05. /legal/privacy が常時 200 を返す
06. /legal/terms が常時 200 を返す
07. /legal/refund が常時 200 を返す
08. /support が常時 200 を返す
09. /dtr/lp の本文に価格「¥1,000（税込）」が明示されている
10. /dtr/lp に返金/サポート方針が明示され、/support と /legal/refund へ到達できる（リンク生存）
11. 法務4ページ（tokushoho/privacy/terms/refund）から Home（/）へ戻れる導線がある
12. フッターが一本化され、法務4 + support + home 導線が全ページで維持されている
13. 公開本文に禁止語彙が0（占い/鑑定/運勢/予言/開運/霊感/当たる）
14. メタ/OG/構造化データ/タイトル/説明文に禁止語彙が0
15. エラー文/空状態/トースト等の表示文言に禁止語彙が0
16. 断定保証（必ず/確実/成功する等）と煽りコピー（最適/おすすめ/今だけ/急げ等）が0
17. 通知っぽさ（ベル/バッジ/未読/赤点/数字煽り）が0
18. 背景NoTouch（html/body/全体トーン改変や全画面疑似要素演出）が0
19. 新規決済導線が追加されていない（表示は可だが購入遷移に接続していない）
20. URL/クエリで状態・権利・contextKey を注入していない（Tap-only遵守）
21. DTR chat history の contextKey 分離（CTX_CORE / CTX_SYNASTRY_* 等）が壊れていない
22. 購入判定の真実が DB/PurchaseCache である（TrustedStorage単独でunlockしない）
23. 購入状態SSOTが増殖していない（別フラグ/別ストアで二重管理していない）
24. 永久権利（Core/Synastry）に再購入誘導がない
25. 期限権利（Weekly/Daily）がある場合、期限切れは静かに眠る（焦り/課金煽りがない）
26. 機密（CLERK_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY等）を要求/出力/ログしていない
27. ログにトークン/認可ヘッダ/個人情報が混入していない（少なくとも公開面では出ない）
28. 新規開発は feature ブランチのみで行い、Preview のみで検証している（Productionを揺らさない）
29. Vercel の Production branch が main に固定されている（誤デプロイがない）
30. main のブランチ保護（PR必須等）で直pushが抑止されている
31. 提出直前/差し戻し時に Gate R 機械判定を再実行し、PASS 証跡をリポジトリ外へ保存している
32. Sensory: vibrate は Light/Medium/Heavy（10/40/[30,50,30]）のみで、通知目的の乱用がない
33. Sensory: duration は 200ms/400ms のみで、easing は cubic-bezier(0.2,0.0,0.0,1.0) のみ
34. Sensory: prefers-reduced-motion: reduce で animation/transition が停止または最小化される
35. Tarot/相性/今日などリスク要素が審査中の public route に露出しておらず、かつ Sanctuary（UI聖域）へのDOM増設・改変を main へ入れていない

End of Checklist
