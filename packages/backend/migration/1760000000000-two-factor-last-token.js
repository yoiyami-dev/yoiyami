/**
 * Add twoFactorLastToken to user_profile to reject TOTP token reuse (GHSA-2m5x-5mp6-6vpq).
 */
export class addTwoFactorLastToken1760000000000 {
    name = 'addTwoFactorLastToken1760000000000'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "user_profile" ADD "twoFactorLastToken" character varying(32)`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "user_profile" DROP COLUMN "twoFactorLastToken"`);
    }
}
