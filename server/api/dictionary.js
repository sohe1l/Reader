const express = require('express');
const db = require('../database/db');
const https = require('https');

var dic = {
  lookupAndSave: async function (word, current_version) {
    var meanings = await this.lookup(word);
    var dbRes = await this.save(word, meanings, current_version);

    return new Promise(function (resolve, reject) {
      resolve(dbRes);
    });
  },

  updateMeanings: async function (word_id, word, version) {
    var meanings = await this.lookup(word);
    var dbRes = await this.addMeanings(word_id, word, meanings, version);

    return new Promise(function (resolve, reject) {
      resolve(dbRes);
    });
  },

  addMeanings: async function (word_id, word, meanings, version) {
    await this.updateVersion(word_id, version);
    for (let i = 0; i < meanings.length; i++) {
      const meaning = meanings[i];
      const shouldInsert = await this.shouldInsert(word_id, meaning);

      if (shouldInsert) {
        db.query('INSERT INTO dictionary_meanings (`word_id`,`fl`,`meaning`) VALUES (?,?,?) ',
          [word_id, meaning.fl, meaning.shortdef[0]], (req, resp) => { });
      }
    }
  },

  shouldInsert: async function (word_id, meaning) {
    return new Promise(function (resolve, reject) {
      if (typeof meaning.shortdef == 'undefined' || meaning.shortdef.length <= 0) {
        resolve(false);
      }
      db.query('SELECT * FROM dictionary_meanings WHERE  word_id= ? AND meaning = ?',
        [word_id, meaning.shortdef[0]], (err, rows, fields) => {
          if (rows.length == 0) resolve(true);
          resolve(false);
        });
    });
  },

  updateVersion: async function (word_id, version) {
    return new Promise(function (resolve, reject) {
      db.query('UPDATE dictionary_words set version = ? WHERE id = ?',
        [version, word_id], (req, resp) => {
          resolve(word_id);
        });
    });
  },

  save: async function (word, meanings, current_version) {
    return new Promise(function (resolve, reject) {
      db.query('INSERT INTO dictionary_words (`word`, `version`) VALUES (?,?) ',
        [word, current_version], (req, resp) => {
          var word_id = resp.insertId;
          meanings.forEach(meaning => {
            if (typeof meaning.shortdef != 'undefined' && meaning.shortdef.length > 0) {
              db.query('INSERT INTO dictionary_meanings (`word_id`,`fl`,`meaning`) VALUES (?,?,?) ',
                [word_id, meaning.fl, meaning.shortdef[0]], (req, resp) => { });
            }
          })
          resolve(word_id);
        });
    });
  },

  lookup: async function (word) {
    return new Promise(function (resolve, reject) {
      https.get(
        {
          // IMPORTANT: evertime we switch a api update current_version in lookup.js
          // previous api http://www.dictionaryapi.com/api/v3/references/learners/json/semiliterate?key=44e0ef0b-a516-4c4d-8fff-12be8779749b
          host: 'www.dictionaryapi.com',
          // new api for school 
          // MERRIAM-WEBSTER'S SCHOOL DICTIONARY WITH AUDIO (GRADES 9-11)
          // /api/v3/references/sd4/json/?key=6f248551-51e6-44d3-b34e-0576482cc014

          // Merriam-Webster's Collegiate® Dictionary with Audio
          path : '/api/v3/references/collegiate/json/' + encodeURI(word) + '?key=2fcd2f96-1563-4565-8915-a33a22ca01a1',
        }, (resp) => {

          var data = '';
          resp.on('data', function (d) {
            console.log(d);
            data += d;
          });
          resp.on('end', () => {
            var results = JSON.parse(data);
            console.log(results);
            resolve(results) // successfully fill promise
          });
        }).on("error", (err) => {
          console.log("Error: " + err.message);
          resolve("error") // successfully fill promise
        });
      console.log("looking up");
    })
  }
}

module.exports = dic;