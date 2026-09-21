/**
 * Stop using resources hosted by the former 藍.moe instance and point the
 * default project links at Yoiyami.
 */
export class yoiyamiResources1700000000001 {
    name = 'yoiyamiResources1700000000001'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "meta" ALTER COLUMN "errorImageUrl" DROP DEFAULT`);
        await queryRunner.query(`UPDATE "meta" SET "errorImageUrl" = NULL WHERE "errorImageUrl" LIKE 'https://xn--931a.moe/%'`);

        await queryRunner.query(`ALTER TABLE "meta" ALTER COLUMN "repositoryUrl" SET DEFAULT 'https://github.com/yoiyami-dev/yoiyami'`);
        await queryRunner.query(`ALTER TABLE "meta" ALTER COLUMN "feedbackUrl" SET DEFAULT 'https://github.com/yoiyami-dev/yoiyami/issues/new'`);
        await queryRunner.query(`UPDATE "meta" SET "repositoryUrl" = 'https://github.com/yoiyami-dev/yoiyami' WHERE "repositoryUrl" = 'https://github.com/misskey-dev/misskey'`);
        await queryRunner.query(`UPDATE "meta" SET "feedbackUrl" = 'https://github.com/yoiyami-dev/yoiyami/issues/new' WHERE "feedbackUrl" = 'https://github.com/misskey-dev/misskey/issues/new'`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "meta" ALTER COLUMN "errorImageUrl" SET DEFAULT 'https://xn--931a.moe/aiart/yubitun.png'`);
        await queryRunner.query(`ALTER TABLE "meta" ALTER COLUMN "repositoryUrl" SET DEFAULT 'https://github.com/misskey-dev/misskey'`);
        await queryRunner.query(`ALTER TABLE "meta" ALTER COLUMN "feedbackUrl" SET DEFAULT 'https://github.com/misskey-dev/misskey/issues/new'`);
    }
}
