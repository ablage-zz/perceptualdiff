/*
 Perceptual Diff
 Copyright (C) 2006-2011 Yangli Hector Yee
 Copyright (C) 2011-2014 Steven Myint
 Ported to Node: Marcel Erz

 This program is free software; you can redistribute it and/or modify it under
 the terms of the GNU General Public License as published by the Free Software
 Foundation; either version 2 of the License, or (at your option) any later
 version.

 This program is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
 PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 this program; if not, write to the Free Software Foundation, Inc., 59 Temple
 Place, Suite 330, Boston, MA 02111-1307 USA
 */

var assert = require('assert'),
  LPyramid = require('./lib/lpyramid.js'),
  PNGImage = require('png-image'),
  metrics = require('./lib/metric.js');

function PerceptualDiff (options) {

    this.imageA = null;
    this.imageAPath = options.imageAPath;
    assert.ok(options.imageAPath, "Path to image A not given.");

    this.imageB = null;
    this.imageBPath = options.imageBPath;
    assert.ok(options.imageBPath, "Path to image B not given.");

    this.imageOutput = null;
    this.imageOutputPath = options.imageOutputPath;

    this.verbose = options.verbose || false;

    // Only consider luminance; ignore chroma channels in the comparison.
    this.luminanceOnly = options.luminanceOnly || false;

    // Print a sum of the luminance and color differences of each pixel.
    this.sumErrors = options.sumErrors || false;

    // Field of view in degrees.
    this.fieldOfView = options.fieldOfView || 45;

    // The gamma to convert to linear color space
    this.gamma = options.gamma || 2.2;

    this.luminance = options.luminance || 100;

    // Pixel of Percent
    this.thresholdType = options.thresholdType || PerceptualDiff.THRESHOLD_PIXEL;

    // How many pixels different to ignore.
    this.threshold = options.threshold || 100;

    // How many pixels different to not create image.
    this.imageThreshold = options.imageThreshold || 50;

    // How much color to use in the metric.
    // 0.0 is the same as luminance_only_ = true,
    // 1.0 means full strength.
    this.colorFactor = options.colorFactor || 1.0;

    this.pyramidLevels = options.pyramidLevels || 3;

    this.scale = options.scale || false;

    this.outputMaskRed = options.outputMaskRed || 255;
    this.outputMaskGreen = options.outputMaskGreen || 0;
    this.outputMaskBlue = options.outputMaskBlue || 0;
    this.outputMaskAlpha = options.outputMaskAlpha || 255;

    this.outputBackgroundRed = options.outputBackgroundRed;
    this.outputBackgroundGreen = options.outputBackgroundGreen;
    this.outputBackgroundBlue = options.outputBackgroundBlue;
    this.outputBackgroundAlpha = options.outputBackgroundAlpha;

    this.copyImageAToOutput = options.copyImageAToOutput || false;
    this.copyImageBToOutput = options.copyImageBToOutput || false;

    this.outputMaskOpacity = 0.7;

    this.quick = options.quick || false;
}

PerceptualDiff.THRESHOLD_PIXEL = 'pixel';
PerceptualDiff.THRESHOLD_PERCENT = 'percent';

PerceptualDiff.RESULT_FAILED_DIMENSIONS = 0;
PerceptualDiff.RESULT_FAILED_DIFFERENT = 1;
PerceptualDiff.RESULT_IDENTICAL = 5;
PerceptualDiff.RESULT_INDISTINGUISHABLE = 6;
PerceptualDiff.RESULT_SIMILAR = 7;

PerceptualDiff.prototype = {

    run: function (fn) {
        var self = this;

        PNGImage.log = function (text) {
            self.log('ERROR: ' + text);
            throw new Error('ERROR: ' + text);
        };

        this.imageA = PNGImage.readImage(this.imageAPath, function () {
            self.imageB = PNGImage.readImage(self.imageBPath, function () {

                if (self.scale) self._scale();

                self.imageOutput = PNGImage.createImage(self.imageA.getWidth(), self.imageA.getHeight());

                if (self.copyImageAToOutput) {
                    self.imageA.getImage().bitblt(self.imageOutput.getImage(), 0, 0, self.imageA.getWidth(), self.imageA.getHeight(), 0, 0);

                } else if (self.copyImageBToOutput) {
                    self.imageB.getImage().bitblt(self.imageOutput.getImage(), 0, 0, self.imageB.getWidth(), self.imageB.getHeight(), 0, 0);
                }

                self._yee_compare(fn);
            });
        });
    },

    isPassed: function (result) {
        return (result !== PerceptualDiff.RESULT_FAILED_DIFFERENT) && (result !== PerceptualDiff.RESULT_FAILED_DIMENSIONS);
    },

    hasOutput: function (result) {
        return (result === PerceptualDiff.RESULT_FAILED_DIFFERENT) || (result === PerceptualDiff.RESULT_SIMILAR);
    },

    _scale: function () {

        var min_width, min_height;

        if (this.imageA.getWidth() != this.imageB.getWidth() || this.imageA.getHeight() != this.imageB.getHeight()) {
            min_width = this.imageA.getWidth();
            if (this.imageB.getWidth() < min_width) {
                min_width = this.imageB.getWidth();
            }

            min_height = this.imageA.getHeight();
            if (this.imageB.getHeight() < min_height) {
                min_height = this.imageB.getHeight();
            }

            if (this.verbose) this.log("Scaling to " + min_width + " x " + min_height);

            this.imageA.clip(0, 0, min_width, min_height);
            this.imageB.clip(0, 0, min_width, min_height);
        }
    },

    isAboveThreshold: function (items, total) {
        if ((this.thresholdType === PerceptualDiff.THRESHOLD_PIXEL) && (this.threshold <= items)) {
            return true;
        } else if (this.threshold <= (items / total)) {
            return true;
        }
        return false;
    },

    isAboveImageThreshold: function (items, total) {
        if ((this.thresholdType === PerceptualDiff.THRESHOLD_PIXEL) && (this.imageThreshold <= items)) {
            return true;
        } else if (this.imageThreshold <= (items / total)) {
            return true;
        }
        return false;
    },

    getInfo: function () {
        var thresholdType = (this.thresholdType === PerceptualDiff.THRESHOLD_PIXEL ? 'px' : '%'),
            result = [];

        result.push("Field of view: " + this.fieldOfView + " degrees");
        result.push("Threshold: " + this.threshold + thresholdType);
        result.push("Image threshold: " + this.imageThreshold + thresholdType);
        result.push("Gamma: " + this.gamma);
        result.push("Luminance: " + this.luminance + " cd/m^2");
        result.push("Pyramid-Levels: " + this.pyramidLevels);

        return result;
    },


    log: function (text) {
        // Nothing here; Overwrite this to add some functionality
    },


    _quickIdentical: function (dim) {
        var diff = 0, idx, i,
            outputImageHasImage = this.copyImageAToOutput || this.copyImageBToOutput,
            outputOpacity = outputImageHasImage ? this.outputMaskOpacity : undefined;

        for (i = 0; i < dim; i++) {
            idx = i << 2;

            if (this.imageA.getAtIndex(idx) !== this.imageB.getAtIndex(idx)) {

                diff++;

                if (this.quick) {
                    this.imageOutput.setAtIndex(idx, this.outputMaskRed, this.outputMaskGreen, this.outputMaskBlue, this.outputMaskAlpha, outputOpacity);
                } else if (this.isAboveImageThreshold(diff, dim)) {
                    break;
                }

            } else if (this.quick) {
                this.imageOutput.setAtIndex(idx, this.outputBackgroundRed, this.outputBackgroundGreen, this.outputBackgroundBlue, this.outputBackgroundAlpha);
            }
        }

        return diff;
    },

    _yee_compare: function (fn) {
        var i, ii, resultA, resultB, r, g, b, w, h, dim, diffPixel, a_lum, b_lum, ab, da, db, la, lb,
            outputImageHasImage = this.copyImageAToOutput || this.copyImageBToOutput,
            outputOpacity = outputImageHasImage ? this.outputMaskOpacity : undefined;;

        if ((this.imageA.getWidth() != this.imageB.getWidth()) || (this.imageA.getHeight() != this.imageB.getHeight())) {
            this.log("Image dimensions do not match");
            fn(PerceptualDiff.RESULT_FAILED_DIMENSIONS);
            return;
        }

        w = this.imageA.getWidth();
        h = this.imageA.getHeight();
        dim = w * h;

        diffPixel = this._quickIdentical(dim);
        if (diffPixel == 0) {
            this.log("Images are binary identical");
            fn(PerceptualDiff.RESULT_IDENTICAL);
            return;
        }
        if (!this.isAboveImageThreshold(diffPixel, dim)) {
            this.log("Images are perceptually indistinguishable");
            fn(PerceptualDiff.RESULT_INDISTINGUISHABLE);
            return;
        }

        if (!this.quick) {
            // Assuming colorspaces are in Adobe RGB (1998) convert to XYZ.
            a_lum = [];
            b_lum = [];

            ab = [];

            if (this.verbose) this.log("Converting RGB to XYZ");

            //#pragma omp parallel for
            for (i = 0; i < dim; i++) {
                ii = i << 2;

                r = Math.pow(this.imageA.getRed(ii) / 255, this.gamma);
                g = Math.pow(this.imageA.getGreen(ii) / 255, this.gamma);
                b = Math.pow(this.imageA.getBlue(ii) / 255, this.gamma);
                resultA = metrics.adobe_rgb_to_lab(r, g, b);

                r = Math.pow(this.imageB.getRed(ii) / 255, this.gamma);
                g = Math.pow(this.imageB.getGreen(ii) / 255, this.gamma);
                b = Math.pow(this.imageB.getBlue(ii) / 255, this.gamma);
                resultB = metrics.adobe_rgb_to_lab(r, g, b);

                a_lum[i] = resultA.y * this.luminance;
                b_lum[i] = resultB.y * this.luminance;

                da = resultA.A - resultB.A;
                db = resultA.B - resultB.B;
                da = da * da;
                db = db * db;
                ab[i] = da + db;
            }

            if (this.verbose) this.log("Constructing Laplacian Pyramids");

            la = new LPyramid(a_lum, w, h, this.pyramidLevels);
            lb = new LPyramid(b_lum, w, h, this.pyramidLevels);

            var num_one_degree_pixels = 2 * Math.tan(this.fieldOfView * 0.5 * Math.PI / 180) * 180 / Math.PI;
            var pixels_per_degree = w / num_one_degree_pixels;

            if (this.verbose) this.log("Performing test");

            var adaptation_level = metrics.adaptation(this.pyramidLevels, num_one_degree_pixels);

            var cpd = [];
            cpd[0] = 0.5 * pixels_per_degree;
            for (i = 1; i < this.pyramidLevels; i++) {
                cpd[i] = 0.5 * cpd[i - 1];
            }
            var csf_max = metrics.csf(3.248, 100);

            var F_freq = [];
            for (i = 0; i < this.pyramidLevels - 2; i++) {
                F_freq[i] = csf_max / metrics.csf(cpd[i], 100);
            }

            diffPixel = 0;
            var error_sum = 0;

            var contrast = [];
            var F_mask = [];

            //#pragma omp parallel for reduction(+ : diffPixel) reduction(+ : error_sum)
            var index;
            for (index = 0; index < dim; index++) {
                var sumContrast = 0;
                for (i = 0; i < this.pyramidLevels - 2; i++) {
                    var n1 = Math.abs(la.getValue(index, i) - la.getValue(index, i + 1));
                    var n2 = Math.abs(lb.getValue(index, i) - lb.getValue(index, i + 1));
                    var numerator = (n1 > n2) ? n1 : n2;
                    var d1 = Math.abs(la.getValue(index, i + 2));
                    var d2 = Math.abs(lb.getValue(index, i + 2));
                    var denominator = (d1 > d2) ? d1 : d2;
                    if (denominator < 1e-5) denominator = 1e-5;
                    contrast[i] = numerator / denominator;
                    sumContrast += contrast[i];
                }
                if (sumContrast < 1e-5) sumContrast = 1e-5;

                var adapt = la.getValue(index, adaptation_level) + lb.getValue(index, adaptation_level) * 0.5;
                if (adapt < 1e-5) adapt = 1e-5;
                for (i = 0; i < this.pyramidLevels - 2; i++) {
                    F_mask[i] = metrics.mask(contrast[i] * metrics.csf(cpd[i], adapt));
                }

                var factor = 0;
                for (i = 0; i < this.pyramidLevels - 2; i++) {
                    factor += contrast[i] * F_freq[i] * F_mask[i] / sumContrast;
                }
                if (factor < 1) factor = 1;
                if (factor > 10) factor = 10;

                var delta = Math.abs(la.getValue(index, 0) - lb.getValue(index, 0));
                error_sum += delta;

                var pass = true;

                // pure luminance test
                if (delta > factor * metrics.tvi(adapt)) pass = false;

                if (pass && !this.luminanceOnly) {
                    // CIE delta E test with modifications
                    var color_scale = this.colorFactor;
                    // ramp down the color test in scotopic regions
                    if (adapt < 10) {
                        // Don't do color test at all.
                        color_scale = 0;
                    }
                    var delta_e = ab[index] * color_scale;
                    error_sum += delta_e;
                    if (delta_e > factor) pass = false;
                }

                if (!pass) {
                    diffPixel++;
                    this.imageOutput.setAtIndex(index << 2, this.outputMaskRed, this.outputMaskGreen, this.outputMaskBlue, this.outputMaskAlpha, outputOpacity);

                } else {
                    this.imageOutput.setAtIndex(index << 2, this.outputBackgroundRed, this.outputBackgroundGreen, this.outputBackgroundBlue, this.outputBackgroundAlpha);
                }
            }
        }

        var self = this;
        var completion = function () {
            if (self.isAboveThreshold(diffPixel, dim)) {
                self.log("Images are visibly different");
                self.log(diffPixel + " pixels are different");
                if (self.sumErrors) self.log(error_sum + " error sum");
                fn(PerceptualDiff.RESULT_FAILED_DIFFERENT);
            } else {
                self.log("Images are similar");
                self.log(diffPixel + " pixels are different");
                fn(PerceptualDiff.RESULT_SIMILAR);
            }
        };

        // Always output image difference if requested.
        if (this.imageOutputPath) {
            this.imageOutput.writeImage(this.imageOutputPath, function () {
                self.log("Wrote difference image to " + self.imageOutputPath);
                completion();
            });
        } else {
            completion();
        }
    }
};

PerceptualDiff.version = "1.3.13";

module.exports = PerceptualDiff;
