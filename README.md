# SVS Index

A searchable index of Singing Voice Synthesizer (SVS) singers and software. 

## Contributing

We welcome contributions! You can add new singers or software in two ways:

1. Go to [Issues](https://github.com/openutau/svs-index/issues/new/choose)
2. Choose "New Singer Submission" or "New Software Submission"
3. Fill out the form with all required information
4. Submit the issue

Our automation will:
- Validate your submission
- Create a pull request automatically
- Notify you of the status

## Data Schema

### Categories

Software can be categorized as:
- `host` - Main synthesis engine/editor
- `host_extension` - Plugins or extensions
- `utility` - Supporting tools

### Tags

Use tags to add searchable metadata:
- Engine types: `vocaloid`, `utau`, `synthesizer-v`, `diffsinger`
- Language: `en`, `ja`, `zh`
- License: `commercial`, `free`, `open-source`

## License

This project is open source and available under the MIT License.

## Credits

Built with:
- [Vite](https://vite.dev/) - Fast build tool
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) - Client-side storage

---

**Maintained by the OpenUTAU community** | [Report an Issue](https://github.com/openutau/svs-index/issues)
