{
  "targets": [{
    "target_name": "myaddon", 
    "sources": ["addon.cc"
    ,"Src/FileModule.cc",
    "Src/DB/Dbset.cc",
    "sqlite3.c",
     "Src/Utils/FileUtils.cc" 
    ], 
    "include_dirs": ["<!@(node -p \"require('node-addon-api').include\")","."],
    "dependencies": ["<!(node -p \"require('node-addon-api').gyp\")"],
    "msvs_version": "2022",
    "defines": ["NODE_ADDON_API_DISABLE_CPP_EXCEPTIONS"],
    "cflags_cc!": ["-fno-exceptions"],
    "conditions": [
      ["OS=='win'", {
        "msvs_settings": {
          "VCCLCompilerTool": { "ExceptionHandling": 1 }
        }
      }]
    ]
  }]
}