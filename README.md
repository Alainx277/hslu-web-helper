# HSLU Web Helper

Adds extra UI to the Hochschule Luzern website(s).

The module listing page now shows the requirements for your bachelors degree and how many credits you have already achieved. When registering for modules, the current amount of credits for that type is shown right on the page, so you know if you still need to take any modules of that type.

### Installation

TBD

### Screenshots

![a screenshot of the HSLU "Meine Anmeldungen" page](assets/screenshot-modules.png)
![a screenshot of the HSLU module registration page](assets/screenshot-registration.png)

### Development

Install dependencies

```shell
npm install
```

Build extension

```shell
npm run build
```

Load the unpacked extension in [Chrome](https://knowledge.workspace.google.com/kb/load-unpacked-extensions-000005962) or [Firefox](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/) (note: Firefox extension must be built with env `BROWSER=firefox`)

Before creating a pull request, lint and format your changes.

```shell
npm run lint
npm run format
```
