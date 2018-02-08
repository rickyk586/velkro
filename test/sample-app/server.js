const Velkro = require('velkro');

const app = new Velkro({
	routes: {
		base: 'api'
	},
	jwt: {
		secret: '7o5493T%$Ywje3@TDD%$Yfs9d54joih'
	}
}).on('error', e => console.error(e));
app.on('routes-loaded', (koaApp, routes) => console.log(JSON.stringify(routes, null, 4)));
app.ready.then(() => console.log('ready'));