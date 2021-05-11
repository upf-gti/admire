# AdMiRe User App

The client application has to be run in a separated thread from the server. 
To do it so run:
```bash
npm start
```
* Runs by default in port 3000. 
* Is proxying any routes tarting with /api to the backend server.

Any configuration needed should be changed on the .env file next to this README file.

## How to create production build!

Create-react-app is made to allow fast development with hot reloading and tight sintax checks. That throws many warnings and errors during the development stages and also doesn't cache the pages. It is mandatory to "compile" the aplication into a client-side only application that can be runned in a static server.
For that purpose, open comand-line to the project root folder and run the following: 
```
npm run build
```
This will generate an optimized version of the project inside a new "build" folder also in the root.

if you dont have a specific server you may find an integrated one within npm, check [this](https://create-react-app.dev/docs/deployment/)

## Aditional Info
We are using the common used ***create-react-app*** framework. All api callbacks are set up to be proxied under the ***/api*** path. This frameworks allows automatic reloading by default. 

**.env** contains all environment variables used by any node project. In this case we set the HTTPS and certs using this.

**.cert** is not commited within the repo. This folder should be placed by the root of the project and containing the key.pem and cert.pem. Checkout the ***Adding HTTPS to react app*** linked below in order to generate such certificates.

**setupProxy.js** is a module with a reserved name that is fetch by the create-react-app framework in order to manually setup proxy redirects.

**jsconfig.json** allows to define the basepath, useful cleaner imports

## Some useful links
* [Tutorial 1](https://daveceddia.com/create-react-app-express-backend/)
* [Tutorial 2](https://www.techomoro.com/how-to-create-a-react-frontend-express-backend-and-connect-them-together/)
* [Proxying backend requests](https://create-react-app.dev/docs/proxying-api-requests-in-development/)
* [Adding HTTPS to react app](https://www.freecodecamp.org/news/how-to-set-up-https-locally-with-create-react-app/)
* [Make import path based on Root in React](https://dev-yakuza.posstree.com/en/react/root-import/)

### Other Interesitng links:
* [Modern React Tutorial Videos](https://www.youtube.com/watch?v=j942wKiXFu8&list=PL4cUxeGkcC9gZD-Tvwfod2gaISzfRiP9d&index=1)
* [Functional Components vs Class Components in React](https://www.twilio.com/blog/react-choose-functional-components)
* [How do I do AJAX requests in React?](https://daveceddia.com/ajax-requests-in-react/)
* [Podria ser una buena guia para añadir una BBDD](https://dev.to/pacheco/my-fullstack-setup-node-js-react-js-and-mongodb-2a4k)
* [**ReactRouter** without webpack](https://www.pluralsight.com/guides/using-react-router-with-cdn-links)
* [Create react components without JSX](https://stackoverflow.com/questions/54018182/how-to-make-script-type-both-text-babel-and-module)
* [**React.createElement** method examples](https://reactgo.com/react-createelement-example/)

### Design utils and ideas
React Bootstrap compiles to regular bootstrap HTML so its fully compatible with any existing example (except maybe adding some minor attribute naming exceptions)
Bootstrap Icons and Font-Awesome icons may be used
* [2019 Trends](https://webflow.com/blog/20-web-design-trends-for-2019)
* ["Bootstrap 4"](https://getbootstrap.com/docs/4.0/)
* ["Bootstrap 5"](https://getbootstrap.com/docs/5.0/)
* [react-bootstrap 4 Components](https://react-bootstrap.netlify.app/components/alerts)
* [react-bootstrap 5 Components](https://react-bootstrap-v5.netlify.app/components/alerts/)

* [Font-Awesome Icons](https://fontawesome.com/icons?d=gallery)
* [Bootstrap Icons](https://icons.getbootstrap.com/)

* [Bootstrap Sidebar](https://bootstrapious.com/p/bootstrap-sidebar)