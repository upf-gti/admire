const {
    override,
    addBabelPlugin,
} = require("customize-cra");

module.exports = override(
    addBabelPlugin(["styled-jsx/babel", { 
        "sourceMaps": true, 
        "optimizeForSpeed": true,
        "plugins": [
            ["styled-jsx-plugin-sass",   { "sassOptions": { "includePaths": ["./src"] } }]
        ] 
    }]),
);