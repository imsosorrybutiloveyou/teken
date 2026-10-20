# Release requirements

For every game update, publish both `AXIS-Windows-x64.exe` and
`AXIS-SERVER-Windows-x64.exe` to GitHub Releases, together with both SHA-256
files and `latest.json`. Keep the same files in the repository's `downloads/`.
The user requested this as the ongoing release policy.

Update `docs/RELEASE_NOTES.md`, run the relevant combat/browser checks, build
both executables with `npm run package:windows`, copy the release artifacts to
`downloads/`, and run `npm run release:verify`. Pushing the new manifest to
`main` triggers `.github/workflows/release.yml`. Verify the workflow and both
published assets before reporting the Release as available. Document a blocker
plainly if GitHub prevents publishing; a source commit alone is not a Release.
