# yoiyamiβ リリースノート

## 12.119.2_rcamod-v5b25
### 概要
- 設定画面の変更
### 詳細
- 設定画面の変更
	- クライアント設定に"投稿画面"(Posting form)が追加されました
	- "一般"(General)にInstanceTickerのシャドウを切り替える項目が追加されました
___
## 12.119.2_rcamod-v5b24
### 概要
- 投稿画面のフッターにPostボタンを追加できるように
### 詳細
- 投稿画面のフッターにPostボタンを追加できるように
	- これに伴ってヘッダーのPostボタンを非表示にすることが可能になりました
___
## 12.119.2_rcamod-v5b23
### 概要
- InstanceTickerのシャドウを非表示に出来るように
### 詳細
- InstanceTickerのシャドウを非表示に出来るように
	- 現時点では透明度などは指定できません
___
## 12.119.2_rcamod-v5b22
### 概要
- TLからカスタム絵文字リアクションを隠すことが出来るように
- リアクションボタンの横にリアクション総数を表示できるように
## 詳細
- TLからカスタム絵文字リアクションを隠すことが出来るように
	- 投稿詳細画面では表示されます
- リアクションボタンの横にリアクション総数を表示できるように
	- 現時点では変化に追従しません（リロード,再描画などが必要です）
___
## 12.119.2_rcamod-v5b21
### 概要
- 藍.moeからリソースを取得しないように
### 詳細
- 藍.moeから画像リソースを取得しないように
	- 意図せず違う画像に入れ替わってしまっていたため、藍.moeからの取得自体を廃止しました
	- このバージョン以降はFont Awesomeのアイコンに置き換えられています
___
## 12.119.2_rcamod-v5b20
### 概要
- 新しい絵文字ピッカー(投稿フォーム下の絵文字ピッカー)を無効に出来るように
- 投稿フォームのフッターに絵文字ボタンを再び表示できるように
### 詳細
- 新しい絵文字ピッカー(投稿フォーム下の絵文字ピッカー)を無効に出来るように
	- 設定値はデバイスごとに管理されます
- 投稿フォームのフッターに絵文字ボタンを再び表示できるように
	- 設定値はデバイスごとに管理されます
___
## 12.119.2_rcamod-v5b19
### 概要
- 投稿画面で画像のクロップ編集が可能に
### 詳細
- 投稿画面で画像のクロップ編集が可能に
	- アイコン変更の際に使用されていた画像クロップツールを改良して使用しています
### 備考
- highDefinitionにtrueが渡された場合のみ、4096*4096を上限に編集が可能になるように変更されました
	- 既存のコードから呼び出される際に予期しないサイズを返すことを防ぐため
- 渡されるデータの形式がpngからjpegに変更されました
	- pngである必要がなさそうなのでこれはすべての場合に適応されます
___
## 12.119.2_rcamod-v5b18
### 概要
- v13と同じ動画プレイヤーを使用できるように
### 詳細
- v13と同じ動画プレイヤーを使用できるように
	- v13で採用されたvue-plyrに対応しました
	- v13にて一部の環境で表示が潰れるなどの問題を確認していたため、任意で切り替えが可能になっています（デフォルト有効）

___
## 12.119.2_rcamod-v5b17
### 概要
- 配信モードを追加
### 詳細
- 配信モードを追加
	- 画面配信中などに有効にすることで、公開範囲がFollowers以下の投稿をすべてミュート扱いとしてたたんで表示します（誤操作防止のため展開することは出来ません）
___
## 12.119.2_rcamod-v5b16
### 概要
- MFMに関する微修正
### 詳細
- MFMに関する微修正
	- scaleがサジェストされない問題を修正
___
## 12.119.2_rcamod-v5b15
### 概要
- デフォルトの設定値を変更
### 概要
- デフォルトの設定値を変更
	- iOSなど一部環境以外で暴走するため、ブラー関連をデフォルトで無効に変更
___
## 12.119.2_rcamod-v5b14
### 概要
- モバイルUIの改修
### 詳細
- モバイルUIの改修
	- タブエリアに表示するアイコンをある程度カスタム出来るようになりました
___
## 12.119.2_rcamod-v5b13
### 概要
- KaTeXが正常に動作しない問題の修正
___
## 12.119.2_rcamod-v5b12
### 概要
- パッケージのバージョン調整
### 詳細
- パッケージのバージョン調整
	- Viteのv4.0.4への更新を取り消し、v3.1.0へダウングレード
___
## 12.119.2_rcamod-v5b11
### 概要
- パッケージのアップデート
### 詳細
- パッケージのアップデート
	- MFM v13に対応するついでに一部のパッケージをv13同等までアップデートしました
### 備考
- このバージョンはAndroid/iOSなどで正常に動作**しません**
	- Viteのバージョンに問題があるため次のバージョンで修正されます
___
## 12.119.2_rcamod-v5b10a2
### 概要
- 微修正
### 詳細
- 微修正
___
## 12.119.2_rcamod-v5b10a1
### 概要
- v13のMFMに対応
### 詳細
- v13のMFMに対応
	- Misskey v13で追加されたMFMへ対応するテストを行いました
___
## 12.119.2_rcamod-v5b9
### 概要
- ソフトウェア名をyoiyamiへ一部変更
- リポジトリを一部書き換え
- 投稿画面のアイコンを整理
### 詳細
- ソフトウェア名をyoiyamiへ一部変更
	- package.json
- リポジトリを一部書き換え
	- package.json
- 投稿画面のアイコンを整理
	- 絵文字ピッカーを投稿画面下に統合したため、アイコンを一時的に削除
### 備考
- Join misskeyが純Misskey以外を集計対象外としようとする流れがあったため準備として
___
## 12.119.2_rcamod-v5b8
## 概要
- 投稿画面の修正
## 詳細
- 投稿画面の修正
	- CSSの修正(中途半端)
___
## 12.119.2_rcamod-v5b7-alpha2
### 概要
- リアクションの表示サイズを変更
- リポジトリのURLを修正
- 投稿画面を改良
### 詳細
- リアクションの表示サイズを変更
	- いままでよりも大きく
- リポジトリのURLを修正
	- rca-fediに変更した都合
- 投稿画面を改良
	- 入力部の下に絵文字ピッカーを統合
___
## 12.119.0_rcamod-v5b4
### 概要
- モデレータのコントロールパネルを改善
- モデレータの権限を下方修正
- フォントを変更
- ナビゲーションバーにウィジェットボタンを追加(暫定)
- タブエリアの比率を変更
- タブエリアのPostボタンのデザインを変更
- ロールアイコンを実装
- 一部画面の余白修正
### 詳細
- モデレータのコントロールパネルを改善
	- 不要な項目を非表示に
- モデレータの権限を下方修正
	- ドライブのファイル管理に関連するすべての操作がAPIレベルで禁止されました
- フォントを変更
	- Koruri Font
- ナビゲーションバーにウィジェットボタンを追加(暫定)
	- 動かない
- タブエリアの比率を変更
	- ボタンが小さすぎたため
- タブエリアのPostボタンのデザインを変更
	- アイコンの横に表示していたテキストを削除(スペース不足のため)
- ロールアイコンを実装
	- Administrator, Moderatorが付与されている場合ユーザーページにわかりやすく表示されます
- 一部画面の余白修正
	- APIキー取得画面の余白を修正
### 備考
- おそらく間に複数のバージョンを含んでいますが、タグが存在しなく区切りが不明なためすべてここに統合しています
___
## 12.119.0_rcamod-v2-release
### リリース
___
## 12.119.0_rcamod-v2-beta7.1
### 概要
- デスクトップでオンライン数を確認しやすく
- セーフエリアに対応
### 詳細
- デスクトップでオンライン数を確認しやすく
	- 後に崩壊することがわかってRevertされます
- セーフエリアに対応
	- ノッチデザインのiOS端末などで投稿ボタンが意図しない位置に移動する問題を修正
___
## ~~12.119.0_rcamod-v2-beta6~~
### なぜか存在しません

___
## 12.119.0_rcamod-v2-beta5.1
### 概要
- グループ機能をクライアントに追加
### 詳細
- グループ機能をクライアントに追加
	- misskey-dev#9089を移植
___
## 12.119.0_rcamod-v2-beta4
### 概要
- 一部環境のナビゲーションバーの仕様を変更
### 詳細
- 一部環境のナビゲーションバーの仕様を変更
	- インスタンスアイコンを少し小さく左寄せに
	- 右にインスタンス名,オンラインユーザーを表示するように
___
## 12.119.0_rcamod-v2-beta3
### 概要
- 投稿フォームのサイズを大きく変更
- 投稿フォームfooterを変更
### 詳細
- 投稿フォームのサイズを大きく変更
- 投稿フォームfooterを変更
	- 一部ボタンをfooterへ移動
	- ボタンを少し小さく
	- アイコンを中央揃えに
___
## 12.119.0_rcamod-v2-beta2
### 概要
- タブエリア微調整
### 詳細
- タブエリア微調整
	- 余白/サイズの修正をしました
	- あたり判定を修正しました
___
## 12.119.0_rcamod-v2-beta1
### 概要
- モバイルUIの改修
### 詳細
- モバイルUIの修正
	- タブエリアの配置などを全体的に変更しました
___
## 12.119.0_rcamod-v1.1
### 概要
- GUI上でユーザーをAdminにする機能の修正
___
## 12.119.0_rcamod-v1
### 概要 
- GUI上でユーザをAdminにすることが出来るようになりました
___