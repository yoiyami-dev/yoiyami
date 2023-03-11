export class entrance1678523872011 {
    name = 'entrance1678523872011'

    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "entrance" ("id" character varying(32) NOT NULL, "name" character varying(64) NOT NULL, "backgroundUrl" character varying(256) NOT NULL, "registerWindowMarginRight" character varying(32) NOT NULL, "registerWindowMarginBottom" character varying(32) NOT NULL, "registerWindowMarginLeft" character varying(32) NOT NULL, "registerWindowMarginTop" character varying NOT NULL DEFAULT '0', "registerWindowType" integer NOT NULL DEFAULT '1', CONSTRAINT "PK_bbabfabdea778f771a2aad17917" PRIMARY KEY ("id")); COMMENT ON COLUMN "entrance"."name" IS 'プリセット名'; COMMENT ON COLUMN "entrance"."backgroundUrl" IS '背景画像URL'; COMMENT ON COLUMN "entrance"."registerWindowMarginRight" IS '登録ウィンドウマージン右'; COMMENT ON COLUMN "entrance"."registerWindowMarginBottom" IS '登録ウィンドウマージン下'; COMMENT ON COLUMN "entrance"."registerWindowMarginLeft" IS '登録ウィンドウマージン左'; COMMENT ON COLUMN "entrance"."registerWindowMarginTop" IS '登録ウィンドウマージン上'; COMMENT ON COLUMN "entrance"."registerWindowType" IS '登録ウィンドウタイプ'`);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "entrance"`);
    }
}
