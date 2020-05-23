# TypeORM-LINQ
True LINQ expressions in Typescript over TypeORM thanks to custom [typescript-expression-transformer](https://www.npmjs.com/package/typescript-expression-transformer).
Thanks to this wrapper, you are able to write clear TS(/JS) with typing support of IDEs, it's regular code.

## Early development!
This is an early stage of development. Everything is subject to change.

## Working Examples
```typescript
// Filter model
let filter = {
    findLastName: "Paul",
    lastNameStarts: "A.*",
    requestedNames: ["Lukas", "Leon", "Paul"]
};

let field = "lastName";

let users = await new LinqSelectQueryBuilder(getConnection().manager, User)
    .where(user => (user.firstName == "Nash" || user[field] == filter.findLastName) && user!["midName"] != "Carl")
    .getRawMany();

// Generated query: SELECT * FROM `user` `__mainEntity` WHERE (`__mainEntity`.`firstName` = 'Nash' OR `__mainEntity`.`lastName` = ?) AND `__mainEntity`.`midName` != 'Carl' -- PARAMETERS: ["Paul"]

let users2 = await new LinqSelectQueryBuilder(getConnection().manager, User)
    .where(user => user.firstName.match(filter.lastNameStarts) && user.midName != null)
    .getRawMany();

// Generated query: SELECT * FROM `user` `__mainEntity` WHERE `__mainEntity`.`firstName` LIKE ? AND `__mainEntity`.`midName` IS NOT NULL -- PARAMETERS: ["A%"]

let users3 = await new LinqSelectQueryBuilder(getConnection().manager, User)
    .where(user => filter.requestedNames.includes(user.firstName) || user.midName.startsWith("A") || user.midName.endsWith("s"))
    .getRawMany();

// Generated query: SELECT * FROM `user` `__mainEntity` WHERE `__mainEntity`.`firstName` IN (?) OR `__mainEntity`.`midName` LIKE 'A%' OR `__mainEntity`.`midName` LIKE '%s' -- PARAMETERS: [["Lukas","Leon","Paul"]]
```

### Transpiled Code:
```javascript
let filter = {
    findLastName: "Paul",
    lastNameStarts: "A.*",
    requestedNames: ["Lukas", "Leon", "Paul"]
};

let users = await new LinqSelectQueryBuilder_1.default(typeorm_1.getConnection().manager, User_1.User)
    .where({ compiled: user => (user.firstName == "Nash" || user.lastName == filter.findLastName) && user.midName != "Carl", context: { filter }, expression: { "flags": 33024, "kind": 202, "parameters": [{ "flags": 32768, "kind": 156, "name": { "flags": 32768, "kind": 75, "escapedText": "user" }, "symbol": { "flags": 1, "escapedName": "user", "declarations": [null], "exports": {} } }], "equalsGreaterThanToken": { "flags": 32768, "kind": 38 }, "body": { "flags": 0, "kind": 209, "left": { "flags": 0, "kind": 200, "expression": { "flags": 0, "kind": 209,
                    "left": { "flags": 0, "kind": 209, "left": { "flags": 0, "kind": 194, "expression": { "flags": 0, "kind": 75, "escapedText": "user" }, "name": { "flags": 0,
                                "kind": 75, "escapedText": "firstName" } }, "operatorToken": { "flags": 0, "kind": 34 }, "right": { "flags": 0, "kind": 10, "text": "Nash" } }, "operatorToken": { "flags": 0, "kind": 56 }, "right": { "flags": 0, "kind": 209, "left": { "flags": 0, "kind": 194, "expression": { "flags": 0, "kind": 75, "escapedText": "user"
                            }, "name": { "flags": 0, "kind": 75, "escapedText": "lastName" } }, "operatorToken": { "flags": 0, "kind": 34 }, "right": { "flags": 0, "kind": 194, "expression": { "flags": 0, "kind": 75, "escapedText": "filter" }, "name": { "flags": 0, "kind": 75, "escapedText": "findLastName" }
                        } } } },
            "operatorToken": { "flags": 0, "kind": 55 }, "right": { "flags": 0, "kind": 209, "left": { "flags": 0, "kind": 194, "expression": { "flags": 0, "kind": 75, "escapedText": "user" }, "name": { "flags": 0, "kind": 75, "escapedText": "midName" } },
                "operatorToken": { "flags": 0, "kind": 35 }, "right": { "flags": 0, "kind": 10, "text": "Carl" } } }, "symbol": { "flags": 16, "escapedName": "__function", "declarations": [null] }, "locals": {}, "endFlowNode": { "flags": 4, "antecedents": [{ "flags": 1088, "antecedent": { "flags": 3136,
                        "antecedent": { "flags": 3074 } } },
                { "flags": 1056, "antecedent": { "flags": 3076, "antecedents": [{ "flags": 1056 },
                            { "flags": 1056 }] } }, { "flags": 1088 }] } } })
    .getRawMany();

let users2 = await new LinqSelectQueryBuilder_1.default(typeorm_1.getConnection().manager, User_1.User)
    .where({ compiled: user => user.firstName.match(filter.lastNameStarts) && user.midName != null, context: { filter }, expression: { "flags": 33024, "kind": 202, "parameters": [{ "flags": 32768, "kind": 156, "name": { "flags": 32768, "kind": 75, "escapedText": "user" }, "symbol": { "flags": 1, "escapedName": "user", "declarations": [null], "exports": {} } }], "equalsGreaterThanToken": { "flags": 32768, "kind": 38 }, "body": { "flags": 0, "kind": 209, "left": { "flags": 0, "kind": 196, "expression": { "flags": 0, "kind": 194,
                    "expression": { "flags": 0, "kind": 194,
                        "expression": { "flags": 0, "kind": 75, "escapedText": "user" }, "name": { "flags": 0, "kind": 75, "escapedText": "firstName" } }, "name": { "flags": 0, "kind": 75, "escapedText": "match" } }, "arguments": [{ "flags": 0, "kind": 194, "expression": { "flags": 0, "kind": 75,
                            "escapedText": "filter" }, "name": { "flags": 0, "kind": 75, "escapedText": "lastNameStarts" } }] }, "operatorToken": { "flags": 0,
                "kind": 55 }, "right": { "flags": 0, "kind": 209, "left": { "flags": 0, "kind": 194, "expression": { "flags": 0, "kind": 75, "escapedText": "user" }, "name": { "flags": 0, "kind": 75, "escapedText": "midName" } }, "operatorToken": { "flags": 0, "kind": 35 },
                "right": { "flags": 0,
                    "kind": 100 } } }, "symbol": {
            "flags": 16, "escapedName": "__function", "declarations": [null] }, "locals": {}, "endFlowNode": { "flags": 4, "antecedents": [{ "flags": 1088, "antecedent": { "flags": 3074 } }, { "flags": 1056, "antecedent": { "flags": 3104 } }, { "flags": 1088 }]
        } } })
    .getRawMany();

let users3 = await new LinqSelectQueryBuilder_1.default(typeorm_1.getConnection().manager, User_1.User)
    .where({ compiled: user => filter.requestedNames.includes(user.firstName) || user.midName.startsWith("A") || user.midName.endsWith("s"), context: { filter }, expression: { "flags": 33024, "kind": 202, "parameters": [{ "flags": 32768, "kind": 156, "name": { "flags": 32768, "kind": 75, "escapedText": "user" }, "symbol": { "flags": 1, "escapedName": "user", "declarations": [null], "exports": {} } }], "equalsGreaterThanToken": { "flags": 32768, "kind": 38 }, "body": { "flags": 0, "kind": 209, "left": { "flags": 0, "kind": 209, "left": { "flags": 0, "kind": 196, "expression": { "flags": 0, "kind": 194, "expression": { "flags": 0, "kind": 194, "expression": { "flags": 0, "kind": 75, "escapedText": "filter" }, "name": { "flags": 0, "kind": 75, "escapedText": "requestedNames" } }, "name": { "flags": 0, "kind": 75, "escapedText": "includes" } }, "arguments": [{ "flags": 0, "kind": 194, "expression": { "flags": 0, "kind": 75, "escapedText": "user" }, "name": { "flags": 0, "kind": 75, "escapedText": "firstName" } }] }, "operatorToken": { "flags": 0, "kind": 56 }, "right": { "flags": 0, "kind": 196, "expression": { "flags": 0, "kind": 194, "expression": { "flags": 0, "kind": 194, "expression": { "flags": 0, "kind": 75, "escapedText": "user" }, "name": { "flags": 0,
                                "kind": 75, "escapedText": "midName" } }, "name": {
                            "flags": 0, "kind": 75, "escapedText": "startsWith" } }, "arguments": [{ "flags": 0, "kind": 10, "text": "A" }] } }, "operatorToken": { "flags": 0, "kind": 56 }, "right": { "flags": 0, "kind": 196, "expression": { "flags": 0, "kind": 194, "expression": { "flags": 0, "kind": 194,
                        "expression": { "flags": 0,
                            "kind": 75, "escapedText": "user" }, "name": { "flags": 0, "kind": 75, "escapedText": "midName" } }, "name": { "flags": 0, "kind": 75,
                        "escapedText": "endsWith" } }, "arguments": [{ "flags": 0, "kind": 10, "text": "s" }] } }, "symbol": { "flags": 16, "escapedName": "__function", "declarations": [null] },
        "locals": {}, "endFlowNode": { "flags": 4, "antecedents": [{ "flags": 1056, "antecedent": { "flags": 3074 } }, {
                    "flags": 1056, "antecedent": { "flags": 3136 } }, { "flags": 1056, "antecedent": { "flags": 3136 } }, { "flags": 1088 }] } } })
    .getRawMany();
```

### Valid but not Working Example (soon)
```typescript
await new LinqSelectQueryBuilder(getConnection().manager, User)
    .innerJoin(
        UserAccount, 
        (user, userAccount) => user.userAccountId == userAccount.id,
        (user, userAccount) => ({
            user,
            userAccount
        }))
    .innerJoin(
        UserRole, 
        (x, userRole) => x.user.userRoleId == userRole.id,
        (x, userRole) => ({
            ...x,
            userRole
        }))
    .where(x => x.user.firstName.match("A.*") || x.userRole.sysName == UserRoleSysNames.Admin)
    .map(x => ({
        name: x.user.firstName + " " + x.user.lastName,
        login: x.userAccount.login,
        passHash: x.userAccount.passHash,
        salt: x.userAccount.salt
    }))
    .where(x => !!x.name)
    .getMany()
```

## How to Run
To run this, you just need to transpile typescript with mentioned transform plugin. Use [ttypescript](https://www.npmjs.com/package/ttypescript) package for it.
Just add transformer to `tsconfig.json` and run `ttsc` instead of `tsc`.
```json
{
    "compilerOptions": {
        "plugins": [
            { "transform": "typescript-expression-transformer" }
        ]
    }
}
```

or Webpack
```javascript
{
    test: /\.(ts|tsx)$/,
    loader: require.resolve('awesome-typescript-loader'),
    // or
    loader: require.resolve('ts-loader'),
    options: {
        compiler: 'ttypescript'
    }
}
```