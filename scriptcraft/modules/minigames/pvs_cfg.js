/*************************************************************

*************************************************************/
var defaultCfg = "---\n" +
    "game:\n" +
    "  config: default\n" +
    "  default:\n" +
    "    level1: 1\n" +
    "    level2: 1\n" +
    "    level3: 1\n" +
    "    level4: 1\n" +
    "    level5: 1\n" +
    "    spawn:\n" +
    "      x: -100\n" +
    "      y: 4\n"    +
    "      z: 1153\n" +
    "level1:\n" +
    "  attackRate: 16\n" +
    "  healRate:  50\n" +
    "  accuracy:  4\n" +
    "  speed:     1.2\n" +
    "level2:\n" +
    "  attackRate: 8\n" +
    "  healRate:  40\n" +
    "  accuracy:  3\n" +
    "  speed:     1.1\n" +
    "level3:\n" +
    "  attackRate: 4\n" +
    "  healRate:  30\n" +
    "  accuracy:  2\n" +
    "  speed:     1.0\n" +
    "level4:\n" +
    "  attackRate: 2\n" +
    "  healRate:  20\n" +
    "  accuracy:  1\n" +
    "  speed:     0.9\n" +
    "level5:\n" +
    "  attackRate: 1\n" +
    "  healRate:  10\n" +
    "  accuracy:  0\n" +
    "  speed:     0.8\n";

var cfgFile = __plugin.getDataFolder() + "/pvs.yml";

function loadConfig() {
    var yml = org.bukkit.configuration.file.YamlConfiguration;
    var fp = new java.io.File(cfgFile);

    if(config.verbose)
	console.log("config file is " + cfgFile);
 
    if( fp.exists() ) {
	return(yml.loadConfiguration(fp));
    } else {
	return(yml.loadConfiguration(new java.io.StringReader(defaultCfg)));
    }
};

function saveConfig() {
    var yml = org.bukkit.configuration.file.YamlConfiguration;
    var fp = new java.io.File(cfgFile);

    if(config.verbose)
	console.log("config file is " + cfgFile);
 
    if( fp.exists() ) {
	return(yml.loadConfiguration(fp));
    } else {
	return(yml.loadConfiguration(new java.io.StringReader(defaultCfg)));
    }
};

exports.loadConfig = loadConfig;
