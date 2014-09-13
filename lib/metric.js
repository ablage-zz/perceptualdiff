/*
 Metric
 Copyright (C) 2006-2011 Yangli Hector Yee
 Copyright (C) 2011-2014 Steven Myint
 Copyright (C) 2014 Marcel Erz

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

function log10(x) {
    return Math.log(x) / Math.LN10;
}

/*
 * Given the adaptation luminance, this function returns the
 * threshold of visibility in cd per m^2
 * TVI means Threshold vs Intensity function
 * This version comes from Ward Larson Siggraph 1997
 */
function tvi(adaptation_luminance) {
    // returns the threshold luminance given the adaptation luminance
    // units are candelas per meter squared
    var log_a = log10(adaptation_luminance);

    var r;
    if (log_a < -3.94) {
        r = -2.86;
    }
    else if (log_a < -1.44) {
        r = Math.pow(0.405 * log_a + 1.6, 2.18) - 2.86;
    }
    else if (log_a < -0.0184) {
        r = log_a - 0.395;
    }
    else if (log_a < 1.9) {
        r = Math.pow(0.249 * log_a + 0.65, 2.7) - 0.72;
    }
    else {
        r = log_a - 1.255;
    }

    return Math.pow(10.0, r);
}

// computes the contrast sensitivity function (Barten SPIE 1989)
// given the cycles per degree (cpd) and luminance (lum)
function csf(cpd, lum) {
    var a = 440.0 * Math.pow((1.0 + 0.7 / lum), -0.2);
    var b = 0.3 * Math.pow((1.0 + 100.0 / lum), 0.15);
    return csfCache = a * cpd * Math.exp(-b * cpd) * Math.sqrt(1.0 + 0.06 * Math.exp(b * cpd));
}

/*
 * Visual Masking Function from Daly 1993
 */
function mask(contrast) {
    var a = Math.pow(392.498 * contrast, 0.7);
    var b = Math.pow(0.0153 * a, 4.0);
    return Math.pow(1.0 + b, 0.25);
}

// convert Adobe RGB (1998) with reference white D65 to XYZ
function adobe_rgb_to_xyz(r, g, b) {
    // matrix is from http://www.brucelindbloom.com/
    var x = r * 0.576700 + g * 0.185556 + b * 0.188212;
    var y = r * 0.297361 + g * 0.627355 + b * 0.0752847;
    var z = r * 0.0270328 + g * 0.0706879 + b * 0.991248;

    return {
        x: x,
        y: y,
        z: z
    };
}

var global_white = adobe_rgb_to_xyz(1, 1, 1);
var epsilon = 216 / 24389;
var kappa = 24389 / 27;

// convert Adobe RGB (1998) with reference white D65 to XYZ
function adobe_rgb_to_lab(r, g, b) {
    var p = adobe_rgb_to_xyz(r, g, b);
    var x = p.x, y = p.y, z = p.z;

    var f = [];
    var r = [];

    r[0] = x / global_white.x;
    r[1] = y / global_white.y;
    r[2] = z / global_white.z;

    for (var i = 0; i < 3; i++) {
        if (r[i] > epsilon) {
            f[i] = Math.pow(r[i], 1 / 3);
        }
        else {
            f[i] = (kappa * r[i] + 16) / 116;
        }
    }
    var A = 500 * (f[0] - f[1]);
    var B = 200 * (f[1] - f[2]);

    return {
        A: A,
        B: B,
        y: y
    };
}

function adaptation(levels, num_one_degree_pixels) {
    var num_pixels = 1.0;
    var adaptation_level = 0;
    for (var i = 0; i < levels; i++) {
        adaptation_level = i;
        if (num_pixels > num_one_degree_pixels) {
            break;
        }
        num_pixels *= 2;
    }
    // LCOV_EXCL_LINE
    return adaptation_level;
}

module.exports = {
    tvi: tvi,
    csf: csf,
    mask: mask,
    adobe_rgb_to_xyz: adobe_rgb_to_xyz,
    adobe_rgb_to_lab: adobe_rgb_to_lab,
    adaptation: adaptation
};
