/*
 PerceptualDiff - a program that compares two images using a perceptual metric
 based on the paper :
 A perceptual metric for production testing. Journal of graphics tools,
 9(4):33-40, 2004, Hector Yee
 Copyright (C) 2006-2011 Yangli Hector Yee
 Copyright (C) 2011-2014 Steven Myint
 Ported to Node: Marcel Erz

 This program is free software; you can redistribute it and/or modify it under
 the terms of the GNU General Public License as published by the Free Software
 Foundation; either version 2 of the License, or (at your option) any later
 version.

 This program is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
 PARTICULAR PURPOSE. See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 this program; if not, write to the Free Software Foundation, Inc., 59 Temple
 Place, Suite 330, Boston, MA 02111-1307 USA
 */
var PerceptualDiff = require('./../perceptualdiff.js');

try {

    var options = parseArgs(process.argv.slice(1));

    var diff = new PerceptualDiff(options);

    if (diff.verbose) {
        console.log(diff.getInfo().join("\n"));
    }

    console.time('Time');
    diff.run(function (passed) {
        console.timeEnd('Time');

        if (passed) {
            if (diff.verbose) console.log("PASS");
        }
        else {
            console.log("FAIL");
        }

        process.exit(passed ? 0 : 1);
    });

} catch (exception) {
    console.error(exception.message);
    process.exit(1);
}

function printHelp() {
    console.log("Usage: node peceptualdiff.js <image1> <image2>");
    console.log("");
    console.log("  Compares image1 and image2 using a perceptually based image metric.");
    console.log("");
    console.log("  Options:");
    console.log("    --verbose           Turn on verbose mode");
    console.log("    --fov deg           Field of view in degrees [0.1, 89.9] (default: 45.0)");
    console.log("    --threshold p       Number of pixels/percent p below which differences are ignored");
    console.log("    --threshold-image p Number of pixels/percent p below which differences are not generated (see --output)");
    console.log("    --threshold-type p  'pixel' and 'percent' as type of threshold. (default: pixel)");
    console.log("    --pyramid-levels p  Number of levels of Laplacian pyramids. (default: 3)");
    console.log("    --gamma g           Value to convert rgb into linear space (default: 2.2)");
    console.log("    --luminance l       White luminance (default: 100.0 cdm^-2)");
    console.log("    --luminance-only    Only consider luminance; ignore chroma (color) in the comparison");
    console.log("    --color-factor      How much of color to use [0.0, 1.0] (default: 1.0)");
    console.log("    --scale             Scale images to match each other's dimensions");
    console.log("    --sum-errors        Print a sum of the luminance and color differences");
    console.log("    --output o          Write difference to the file o");
    console.log("    --version           Print version");
    console.log("    --help              This help");
    console.log("");
}

function optionMatches(arg, optionName) {
    return (arg == "--" + optionName) || (arg == "-" + optionName);
}

function parseArgs (argv) {

    var i,
      temporary,
      imageCount = 0,
      argc = argv.length,
      options = {};

    if (argc <= 1) {
        printHelp();
        process.exit(1);
    }

    for (i = 1; i < argc; i++) {
        try {
            if (optionMatches(argv[i], "help")) {
                print_help();
                process.exit(0);
            }
            else if (optionMatches(argv[i], "fov")) {
                if (++i < argc) {
                    options.fieldOfView = parseFloat(argv[i]);
                }
            }
            else if (optionMatches(argv[i], "verbose")) {
                options.verbose = true;
            }
            else if (optionMatches(argv[i], "threshold-type")) {
                if (++i < argc) {
                    if (argv[i] === 'pixel') {
                        options.thresholdType = PerceptualDiff.THRESHOLD_PIXEL;

                    } else if (argv[i] === 'percent') {
                        options.thresholdType = PerceptualDiff.THRESHOLD_PERCENT;

                    } else {
                        throw new Error("-threshold-type can be either 'pixel' or 'percent'");
                    }
                }
            }
            else if (optionMatches(argv[i], "threshold")) {
                if (++i < argc) {
                    temporary = parseFloat(argv[i]);
                    if (temporary < 0) {
                        throw new Error("-threshold must be positive");
                    }
                    options.threshold = temporary;
                }
            }
            else if (optionMatches(argv[i], "threshold-image")) {
                if (++i < argc) {
                    temporary = parseFloat(argv[i]);
                    if (temporary < 0) {
                        throw new Error("-threshold-image must be positive");
                    }
                    options.imageThreshold = temporary;
                }
            }
            else if (optionMatches(argv[i], "gamma")) {
                if (++i < argc) {
                    options.gamma = parseFloat(argv[i]);
                }
            }
            else if (optionMatches(argv[i], "pyramid-levels")) {
                if (++i < argc) {
                    temporary = parseInt(argv[i], 10);
                    if (temporary < 1) {
                        throw new Error("-pyramid-levels must be greater or equal to 1");
                    }
                    options.pyramidLevels = temporary;
                }
            }
            else if (optionMatches(argv[i], "luminance")) {
                if (++i < argc) {
                    options.luminance = parseFloat(argv[i]);
                }
            }
            else if (optionMatches(argv[i], "luminance-only")) {
                options.luminanceOnly = true;
            }
            else if (optionMatches(argv[i], "sum-errors")) {
                options.sumErrors = true;
            }
            else if (optionMatches(argv[i], "color-factor")) {
                if (++i < argc) {
                    options.colorFactor = parseFloat(argv[i]);
                }
            }
            else if (optionMatches(argv[i], "scale")) {
                options.scale = true;
            }
            else if (optionMatches(argv[i], "output")) {
                if (++i < argc) {
                    options.imageOutputPath = argv[i];
                }
            }
            else if (optionMatches(argv[i], "version")) {
                console.log("perceptualdiff " + VERSION);
            }
            else if (imageCount < 2) {
                ++imageCount;
                if (imageCount == 1) {
                    options.imageAPath = argv[i];
                }
                else {
                    options.imageBPath = argv[i];
                }
            }
            else {
                console.log('Warning: option/file "' + argv[i] + '" ignored');
            }
        }
        catch (exception) {
            var reason = (exception.message !== '') ? "; " + exception.message : '';
            throw new Error("Invalid argument (" + argv[i] + ") for " + argv[i - 1] + reason);
        }
    }

    if (!options.imageAPath || !options.imageBPath) {
        throw new Error("Not enough image files specified");
    }

    return options;
}