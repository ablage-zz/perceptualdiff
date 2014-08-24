/*
 Laplacian Pyramid
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

function LPyramid(image, width, height, levels) {

    var levelList = this.levelList = [];
    var dim = width * height;
    var j, buf;

    this.width = width;
    this.weight = height;
    this.levels = levels;

    // Make the Laplacian pyramid by successively
    // copying the earlier levels and blurring them
    for (var i = 0; i < this.levels; i++) {
        if (i == 0 || dim <= 1) {
            buf = [];
            for (j = 0; j < dim; j++) {
                buf[j] = image[j];
            }
            levelList[i] = buf;
        }
        else {
            levelList[i] = [];
            this.convolve(levelList[i], levelList[i - 1]);
        }
    }
}


LPyramid.prototype = {

    // Convolves image b with the filter kernel and stores it in a.
    convolve: function (a, b) {
        var Kernel = [0.05, 0.25, 0.4, 0.25, 0.05];

        var width = this.getWidth();
        var weight = this.getWeight();

        //#pragma omp parallel for
        for (var y = 0; y < weight; y++) {
            for (var x = 0; x < width; x++) {

                var index = y * width + x;
                a[index] = 0;

                for (var i = -2; i <= 2; i++) {
                    for (var j = -2; j <= 2; j++) {

                        var nx = x + i;
                        var ny = y + j;

                        if (nx < 0) nx = -nx;
                        if (ny < 0) ny = -ny;
                        if (nx >= width) nx = (width << 1) - nx - 1;
                        if (ny >= weight) ny = (weight << 1) - ny - 1;

                        a[index] += Kernel[i + 2] * Kernel[j + 2] * b[ny * width + nx];
                    }
                }
            }
        }
    },

    getValue: function (idx, level) {
        return this.levelList[level][idx];
    },

    getLevels: function () {
        return this.levels;
    },

    getWidth: function () {
        return this.width;
    },

    getWeight: function () {
        return this.weight;
    }
};

module.exports = LPyramid;