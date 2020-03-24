const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const BundleTracker = require('webpack4-bundle-tracker');
const path = require('path');

function make_config(env) {
    const is_prod = (env == 'prod');
    return {
	mode: is_prod ? 'production' : 'development',
	watch: !is_prod,
	devtool: is_prod ? false : 'inline-source-map',
	optimization: !is_prod ? {} : {
	    splitChunks: {
		chunks: 'all'
	    },
	    
	    runtimeChunk: {
		name: entrypoint => `runtime-${entrypoint.name}`
	    }
	},
	
	entry: {
	    index: './shrunk/static/ts/index.ts',
	    stats: './shrunk/static/ts/stats.ts',
	    orgs: './shrunk/static/ts/orgs.ts',
	    manage_org: './shrunk/static/ts/manage_org.ts',
	    admin: './shrunk/static/ts/admin.ts',
	    login: './shrunk/static/ts/login.ts',
	    faq: './shrunk/static/ts/faq.ts',
	    role: './shrunk/static/ts/role.ts',
	    org_stats: './shrunk/static/ts/org_stats.ts',
	    endpoint_stats: './shrunk/static/ts/endpoint_stats.ts'
	},

	plugins: [
	    new MiniCssExtractPlugin(),
            new BundleTracker({
                filename: './shrunk/static/webpack-stats.json'
            })
	],

	module: {
	    rules: [
		{
		    test: /\.ts$/,
		    use: 'ts-loader',
		    exclude: /node_modules/
		},
		{
		    test: /\.scss$/,
		    use: [{
			loader: MiniCssExtractPlugin.loader,
		    }, {
			loader: 'css-loader',
			options: {
			    sourceMap: !is_prod
			}
		    }, {
			loader: 'postcss-loader',
			options: {
			    plugins: function () {
				return [
				    require('precss'),
				    require('autoprefixer')
				];
			    }
			}
		    }, {
			loader: 'sass-loader',
			options: {
			    sourceMap: !is_prod
			}
		    }]
		}
	    ]
	},
	
	resolve: {
	    extensions: ['.ts', '.js', '.scss']
	},
	
	output: {
	    path: path.resolve(__dirname, 'shrunk/static/dist'),
            publicPath: '/app/static/dist/',
	    filename: '[name].js'
	}
    }
};

module.exports = make_config;
