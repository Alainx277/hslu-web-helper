# HSLU Web Helper

Adds extra UI to the Hochschule Luzern website(s).

The module listing page now shows the requirements for your bachelors degree and how many credits you have already achieved. When registering for modules, the current amount of credits for that type is shown right on the page, so you know if you still need to take any modules of that type.

### Installation

[Install on Firefox](https://github.com/Alainx277/hslu-web-helper/releases/download/0.1.1/hslu_web_helper-0.1.1.xpi)

[Install on Chrome](https://chromewebstore.google.com/detail/hslu-web-helper/jmmmhflieajgaepocgkhdemnaakmedki)

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

### Firefox Release Build

This section is required for Mozilla to review the addon.

Software:

- Windows 10
- node v20.11.0
- npm 10.2.4
- powershell

Build instructions:

```
npm install
$env:BROWSER='firefox'
$env:NODE_ENV='production'
npm run build
```
