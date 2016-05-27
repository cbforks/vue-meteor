VueComponentCompiler = class VueComponentCompiler extends CachingCompiler {
  constructor() {
    super({
      compilerName: 'vuecomponent',
      defaultCacheSize: 1024 * 1024 * 10,
    });

    this.babelOptions = Babel.getDefaultOptions();
  }
  getCacheKey(inputFile) {
    return inputFile.getSourceHash();
  }
  compileResultSize(compileResult) {
    return compileResult.code.length + compileResult.map.length;
  }
  compileOneFile(inputFile) {
    const contents = inputFile.getContentsAsString();
    const inputPath = inputFile.getPathInPackage();

    try {
      const tags = scanHtmlForTags({
        sourceName: inputPath,
        contents: contents,
        tagNames: ['template', 'script', 'style']
      });

      return compileTags(inputFile, tags, this.babelOptions);
    } catch (e) {
      if (e instanceof CompileError) {
        inputFile.error({
          message: e.message,
          line: e.line
        });
        return null;
      } else {
        throw e;
      }
    }
  }
  addCompileResult(inputFile, compileResult) {

    if (compileResult.styles.length !== 0) {
      let css = '';
      for (let style of compileResult.styles) {
        css += style.css;
      }
      addStylesheet(inputFile, {
        data: css
      });
    }


    inputFile.addJavaScript({
      path: inputFile.getPathInPackage() + '.js',
      sourcePath: inputFile.getPathInPackage(),
      data: compileResult.code,
      sourceMap: compileResult.map
    });
  }
}

function compileTags(inputFile, tags, babelOptions) {
  var handler = new VueComponentTagHandler(inputFile, babelOptions);

  tags.forEach((tag) => {
    handler.addTagToResults(tag);
  });

  return handler.getResults();
}

function addStylesheet(inputFile, options) {
  const self = inputFile._resourceSlot;

  const data = options.data.replace(new RegExp("\r\n", "g"), "\n").replace(new RegExp("\r", "g"), "\n");
  inputFile.addJavaScript({
    path: inputFile.getPathInPackage() + '.style.js',
    sourcePath: inputFile.getPathInPackage(),
    data: cssToCommonJS(data),
    sourceMap: options.map
  });
}

function cssToCommonJS(css) {
  css = css.replace(/\n/g, '"+\n"');
  return 'module.exports = require("meteor/modules").addStyles("' + css + '");';
}