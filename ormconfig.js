module.exports = {
	"type": "mysql",
	"host": "localhost",
	"port": 3306,
	"username": "test",
	"password": "test",
	"database": "dev-typeorm-linq",
	
	// Automatic migrations
	"synchronize": false,

	// Set to true to make .printSql() work
	"logging": true,
	
	"entities": [
		"dev/entity/**/*.js",
		"entity/**/*.js"
	],
	"migrations": [
		"dev/data/migration/*.js"
	],
	"seeds": ["dev/data/seed/**/*.js"],
	"subscribers": [
		"dev/subscriber/**/*.js"
	],
	"cli": {
		"migrationsDir": "./dev/data/migration"
	}
};