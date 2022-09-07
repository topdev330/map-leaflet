# README

A map component to be embedded in a page.

It plots choropleth maps of the British regions and constituencies and draws the data from a Google Sheet spreadsheet with a specific format.

It also plots markers as points on the map.

## Deployment on production

*You can find additional information on how to deploy the map in the [README file](./dist/README.md) inside the dist folder.*

## Development setup

You can change the source code and test locally by executing the following steps:

1. Clone or download and extract this repository.
1. Install NPM from https://www.npmjs.com/get-npm
1. Open up a command line terminal and move into the directory where the file `package.json` resides.
1. Execute the following command to download and install the dependencies of the project: `npm install`
1. Open up the local webserver by executing the following command: `npm run dev`

You will be able to access the development instance of the map by going to http://localhost:4444 on your browser.

The main code is located inside the `src` directory and the main files are `index.js` and `styles.scss`.

### Changing the colour scheme

To change the main colour scheme you need to modify both the `config.js` and the `styles.scss` files. If you ran `npm run dev` and opened up the page in your browser, the browser should refresh itself with the new changes as soon as you change either one of those files.

Open the file `src/styles.scss` with your text editor and replace the main colour in the first line:

    `$main-color: #ff9900;`

Open the file `src/config.js` with your text editor and replace the value of the constant MAIN_COLOUR:

    `const MAIN_COLOUR = '#ff9900';`

Both colours should be the same or very similar. The application will extrapolate all the other colours (lighter or darker) based on these variables.

On the `src/styles.scss` file you can also define a light colour that is used in the buttons of the interface. This colour can be defined on its own or based on the main colour:

    `$lightest-color: lighten($main-color, 80%);`

You can also change the colour of the outline in a selected polygon on the `src/config.js` by changing the line right under MAIN_COLOUR:

    `const SELECTION_COLOUR = '#cacaca';`

You can define two types of markers and you can define their colours on the `src/styles.scss` by changing the following lines at the top of the file:

```
    $marker1-background: $lightest-color;
    $marker1-border: black;
    $marker2-background: lighten($main-color, 50%);
    $marker2-border: $main-color;
```

These colours will affect both the markers themselves and the tooltips associated to them.

**Once you have changed the colours and you are happy with the preview on the local development environment, you need to build the production files.**

### Building production files

On the command line terminal, execute the command `npm run build` to create all the final files that you need to use on your report.

These files will be generated inside the `dist` folder (and will override them if they already exist).

Follow the instructions on the `dist/README.html` to use them on production.
