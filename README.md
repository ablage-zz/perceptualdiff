node-perceptualdiff
===================

A node port of the perceptualdiff image comparison (http://pdiff.sourceforge.net) with some additional features


#Usage:

The package can be used in two different ways:
 * per command line; just as the original project
 * through a class in your code


##Command-Line usage:

The command-line tool can be found in the ```bin``` directory. You can run the application with

```
node ./bin/perceptualdiff.js <image1>.png <image2>.png
```
Use ```image1``` and ```image2``` as the images you want to compare.

**Note:** This port only supports PNGs!

The command-line tool exposes a couple of flags and parameters for the comparison:
```
--verbose           Turn on verbose mode"
--fov deg           Field of view in degrees [0.1, 89.9] (default: 45.0)
--threshold p       Number of pixels/percent p below which differences are ignored
--threshold-image p Number of pixels/percent p below which differences are not generated (see --output)
--threshold-type p  'pixel' and 'percent' as type of threshold. (default: pixel)
--pyramid-levels p  Number of levels of Laplacian pyramids. (default: 3)
--gamma g           Value to convert rgb into linear space (default: 2.2)
--luminance l       White luminance (default: 100.0 cdm^-2)
--luminance-only    Only consider luminance; ignore chroma (color) in the comparison
--color-factor      How much of color to use [0.0, 1.0] (default: 1.0)
--scale             Scale images to match each other's dimensions
--sum-errors        Print a sum of the luminance and color differences
--output o          Write difference to the file o
--version           Print version
--help              This help
```

Most of the parameters were exposed as the original project does. However, I changed a couple of parameter signatures
to make the interface a little bit more consistent.
* ```--luminanceonly``` was renamed to ```luminance-only```
* ```--colorfactor``` was renamed to ```color-factor```

Since the PNG library, I use, does not support resampling, I needed to remove this feature for now.
So, there is no ```--resample```. Please resample the images through other means before using this diff-tool.

I also added a couple additional features and some were exposed to the command-line tool:
* ```---threshold-image p``` makes it possible to skip some of the comparison, reducing the time spent analysing the
images as node is a LOT slower than C is. This feature will also skip the creation of output images if this threshold is not reached; it simply stops caring if the difference is below the threshold.
* ```---threshold-type p``` changes the threshold by considering absolute pixels or percentage of total pixels. The values are ```pixel``` and ```percent``` respectively.
* ```---pyramid-levels p``` specifies the detail of the comparison - the higher the number is, the higher the comparison resolution but also the longer it will take. ```2``` is the lowest number possible. The original perceptualdiff tool used internally 8 as default. Again, node is just too slow.


##Class usage:

The package can also be used directly in code, without going through the command-line.

**Example:**
```JavaScript
var PerceptualDiff = require('perceptualdiff');

var diff = new PerceptualDiff({
    imageAPath: '...',
    imageBPath: '...',

    scale: true,
    verbose: true,
    pyramidLevels: 5,

    thresholdType: PerceptualDiff.THRESHOLD_PERCENT,
    threshold: 0.01,
    imageThreshold: 0.005,

    outputPath: '...'
});

diff.run(function (passed) {
    console.log(passed ? 'Passed' : 'Failed');
});
```

All the parameters that were available in the command-line tool are also available through the class constructor - they use
camelCasing instead of snake-casing. The class exposes additional parameters that are not available from the command-line.
* ```imageAPath``` Defines the path to the first image that should be compared (required)
* ```imageBPath``` Defines the path to the second image that should be compared (required)
* ```imageOutputPath``` Defines the path to the output-file. If you leaves this one off, then this feature is turned-off.
* ```verbose``` Verbose output (default: false)
* ```luminanceOnly``` Only consider luminance; ignore chroma (color) in the comparison (default: false)
* ```sumErrors``` Print a sum of the luminance and color differences (default: false)
* ```fieldOfView``` Field of view in degrees [0.1, 89.9] (default: 45.0)
* ```gamma``` Value to convert rgb into linear space (default: 2.2)
* ```luminance``` White luminance (default: 100.0 cdm^-2)
* ```thresholdType``` Type of threshold check. This can be PerceptualDiff.THRESHOLD_PIXEL and PerceptualDiff.THRESHOLD_PERCENT (default: THRESHOLD_PIXEL)
* ```threshold``` Number of pixels/percent p below which differences are ignored (default: 100)
* ```imageThreshold``` Number of pixels/percent p below which differences are not generated (default: 50)
* ```colorFactor``` How much of color to use [0.0, 1.0] (default: 1.0)
* ```pyramidLevels``` Number of levels of Laplacian pyramids. (default: 3)
* ```scale``` Scale images to match each other's dimensions (default: false)
* ```outputMaskRed``` Red intensity for the difference highlighting in the output file (default: 255 - full red)
* ```outputMaskGreen``` Green intensity for the difference highlighting in the output file (default: 0)
* ```outputMaskBlue``` Blue intensity for the difference highlighting in the output file (default: 0)
* ```outputMaskAlpha``` Alpha intensity for the difference highlighting in the output file (default: 180 - slightly transparent)
* ```outputBackgroundRed``` Red intensity for the background in the output file (default: 0)
* ```outputBackgroundGreen``` Green intensity for the background in the output file (default: 0)
* ```outputBackgroundBlue``` Blue intensity for the background in the output file (default: 0)
* ```outputBackgroundAlpha``` Alpha intensity for the background in the output file (default: 0 - transparent)


###Logging:

By default, the class logs to the console.log, but you can overwrite this behavior by overwriting ```diff.log```:

```JavaScript
var diff = new PerceptualDiff({
    ...
});

diff.log = function (text) {
    // Do whatever you want to do
};

...
```


#Example:

There are some examples in the ```examples``` folder, where I used screenshots of Wikipedia to check for visual regressions.
You can find examples for:
* Missing DOM elements in ```hidden_regression```
* Disrupted sorting in ```sorting_regression```
* Color changes in ```style_regression```
* Text capitalization in ```text_regression```

All screenshots were compared to ```wikipedia_approved.png```, a previously approved screenshot without a regression.
Each of the regression has the screenshot and the output result, highlighting the differences.


#TODO:

* Code documentation


#LICENSE

The original project was release with the GPL v2 license.