# yoiyami changelog

yoiyami uses its own release version independently from the Misskey codebase it
started from. The current codename is **Dusk** and the release line is **v1**.

The original Misskey history is preserved in [`MISSKEY_CHANGELOG.md`](./MISSKEY_CHANGELOG.md).

## dusk-v1.0.0 (unreleased)

### Changes

- Established yoiyami as the software identity advertised to ActivityPub peers.
- Added an explicit product metadata file with the Yoiyami version and the
  Misskey base version used for compatibility tracking.
- Removed runtime dependencies on the former 藍.moe-hosted placeholder images;
  empty and error states use the bundled Font Awesome icons instead.

### Compatibility

- This release line is based on Misskey v12.119.2.
- The Misskey base version is recorded as metadata for auditability; it is not
  used as Yoiyami's public release version.
