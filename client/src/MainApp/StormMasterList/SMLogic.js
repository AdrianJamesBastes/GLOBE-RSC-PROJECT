import { dict, towerC, provinceNew, cityNew } from './SMSite';
import { parseCsv } from '../../services/fileParsers';

export function extractBaseAndSuffix(nmsString) {
  if (!nmsString) return { cleanBase: '', displayBase: '', suffix: '', suffixSet: new Set() };

  let originalStr = String(nmsString).toUpperCase().trim();
  let displayBase = originalStr;
  let suffixLetters = '';

  const anchors = [
  "DVOC","DVOR","MISOR","MOR","MOCC","MOC","DNGT","CMGN","ZSIB","ZDN",
  "SKUD","MGDN","MGND","SCOT","NCOT","COT","SAR","AGN","LDN","LDS",
  "DDN","SDN","SDS","BUK","DDO","CVLY","AGS","DDS","BAS","SULU",
  "TAWI","ZDS"
];

const anchors2nd = ['TEMPO', 'ID', 'AS', '_D', 'COW', 'TEMP', 'EM', '-D', 'OD', 'IO', 'LS'];

let matched = false;

function findBestAnchor(str, anchors) {
  let bestAnchor = null;
  let bestIndex = -1;
  let bestLength = -1;

  for (const anchor of anchors) {
    const idx = str.lastIndexOf(anchor);
    if (idx === -1) continue;

    const len = anchor.length;

    if (
      len > bestLength ||
      (len === bestLength && idx > bestIndex)
    ) {
      bestAnchor = anchor;
      bestIndex = idx;
      bestLength = len;
    }
  }

  return { bestAnchor, bestIndex };
}

const { bestAnchor, bestIndex } = findBestAnchor(originalStr, anchors);

if (bestAnchor !== null) {
  const anchor = bestAnchor;
  let idx = bestIndex;

  for (const secAnchor of anchors2nd) {
    let secIdx = originalStr.indexOf(secAnchor, idx + anchor.length);

    if (secIdx !== -1) {
      let potentialSuffix = originalStr.slice(
        idx + anchor.length + secAnchor.length
      );

      const isValidSuffix = /^[XYLFWKHVBMNPRT]*$/i.test(potentialSuffix);

      if (isValidSuffix) {
        suffixLetters = potentialSuffix;
        displayBase = originalStr.slice(
          0,
          secIdx + secAnchor.length
        );
        matched = true;
        break;
      } else {
        suffixLetters = "";
        displayBase = originalStr.slice(
          0,
          secIdx + secAnchor.length
        );
        matched = true;
        break;
      }
    }
  }

  if (!matched) {
    let potentialSuffix = originalStr.slice(idx + anchor.length);
    const isValidSuffix = /^[XYLFWKHVBMNPRT]*$/i.test(potentialSuffix);

    if (isValidSuffix) {
      suffixLetters = potentialSuffix;
      displayBase = originalStr.slice(0, idx + anchor.length);
      matched = true;
    } else {
      suffixLetters = "";
      displayBase = originalStr.slice(0, idx + anchor.length);
      matched = true;
    }
  }
}

  const nomatchanchor = ['_D', 'COW', 'TEMPO', 'TEMP', '-D'];

  let found = false;

  if (!matched) {
    for (const anchor of nomatchanchor) {
      let idx = originalStr.lastIndexOf(anchor);
      if (idx !== -1) {
        let potentialSuffix = originalStr.slice(idx + anchor.length);
        const isValidSuffix = /^[XYLFWKHVBMNPRT]*$/i.test(potentialSuffix);

        if (isValidSuffix) {
          suffixLetters = potentialSuffix;
          displayBase = originalStr.slice(0, idx + anchor.length);
          found = true;
          break;
        }else {
          suffixLetters = "";
          displayBase = originalStr.slice(0, idx + anchor.length);
          found = true;
          break;
        }
      }
    }
    if (!found) {
      let fallbackMatch = originalStr.match(/([-_ ]*)((?:ID|AS|[XYLFWKHVBMNPRT])+ )$/i);
      if (!fallbackMatch) {
        fallbackMatch = originalStr.match(/([-_ ]*)((?:ID|AS|[XYLFWKHVBMNPRT])+ )$/i); // fallback pattern if needed
      }
      fallbackMatch = originalStr.match(/([-_ ]*)((?:ID|AS|[XYLFWKHVBMNPRT])+)$/i);
      if (fallbackMatch) {
        let separator = fallbackMatch[1];
        let actualSuffix = fallbackMatch[2];
        displayBase = originalStr.slice(0, -fallbackMatch[0].length) + separator + "--";
        suffixLetters = actualSuffix;
      }
    }
  }
  let cleanBase = displayBase.replace(/[^A-Z0-9]/g, '');

  return {
    cleanBase,
    displayBase,
    suffix: suffixLetters,
    suffixSet: new Set(suffixLetters.split(''))
  };
}

export function getIndex(headers, possibleNames) {
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i]).trim().toUpperCase();
    if (possibleNames.indexOf(h) > -1) return i;
  }
  return -1;
}

export function getCoords(row, latIdx, lngIdx) {
  return {
    lat: latIdx > -1 && row[latIdx] ? row[latIdx] : 7.1905,
    lng: lngIdx > -1 && row[lngIdx] ? row[lngIdx] : 125.4503
  };
}

export function inferLocation(baseName) {
  var name = String(baseName).toUpperCase();
  var result = { city: '', prov: '', area: '' };

  var geoMap = [
    { keys: ['PANABO', 'TADECO'], city: 'PANABO CITY', prov: 'DAVAO DEL NORTE' },
    { keys: ['SAMAL', 'IGACOS'], city: 'ISLAND GARDEN CITY OF SAMAL', prov: 'DAVAO DEL NORTE' },
    { keys: ['TAGUM'], city: 'TAGUM CITY', prov: 'DAVAO DEL NORTE' },
    { keys: ['CARMEN'], city: 'CARMEN', prov: 'DAVAO DEL NORTE' },
    { keys: ['DAVAO', 'DVO', 'ULAS'], city: 'DAVAO CITY', prov: 'DAVAO DEL SUR' },
    { keys: ['DIGOS', 'DDS'], city: 'DIGOS CITY', prov: 'DAVAO DEL SUR' },
    { keys: ['MATI', 'DVOR'], city: 'MATI CITY', prov: 'DAVAO ORIENTAL' },
    { keys: ['KIDAPAWAN', 'KIDAP'], city: 'KIDAPAWAN CITY', prov: 'NORTH COTABATO' },
    { keys: ['COTABATO', 'COTAB'], city: 'COTABATO CITY', prov: 'MAGUINDANAO DEL NORTE' },
    { keys: ['ZAMBOANGA', 'ZAMBOA'], city: 'ZAMBOANGA CITY', prov: 'ZAMBOANGA DEL SUR' },
    { keys: ['GENSAN', 'GSC'], city: 'GENERAL SANTOS CITY', prov: 'SOUTH COTABATO' },
    { keys: ['CDO', 'CAGAYAN'], city: 'CAGAYAN DE ORO CITY', prov: 'MISAMIS ORIENTAL' }
  ];

  for (var i = 0; i < geoMap.length; i++) {
    for (var k = 0; k < geoMap[i].keys.length; k++) {
      if (name.includes(geoMap[i].keys[k])) {
        result.city = geoMap[i].city;
        result.prov = geoMap[i].prov;
        return result;
      }
    }
  }
  return result;
}

export function generateSpecificTechLabel(baseGen, suffixStr) {
  var str = String(suffixStr).toUpperCase();
  var label = baseGen;

  if (baseGen === '4G') {
    var types = [];
    if (/[FLWY]/.test(str)) types.push('');
    if (/H/.test(str)) types.push('');
    if (/V/.test(str)) types.push('');
    if (types.length > 0) label = '4G' + types.join('');
  } else if (baseGen === '5G') {
    var types5g = [];
    if (/M/.test(str)) types5g.push('');
    if (/[PN]/.test(str)) types5g.push('');
    if (types5g.length > 0) label = '5G' + types5g.join('');
  }
  return label;
}

export function processCSVComparison(nmsText, udmText) {
  try {
    var nmsData = parseCsv(nmsText);
    var udmData = parseCsv(udmText);

    if (nmsData.length < 2 || udmData.length < 2) {
      throw new Error('File(s) empty.');
    }

    var nmsHeaders = nmsData[0];
    var udmHeaders = udmData[0];

    var udmNameIdx = getIndex(udmHeaders, ['BCF NAME', 'SITE NAME']);
    var udmIdIdx = getIndex(udmHeaders, ['PLA_ID', 'PLA ID']);
    var udmLatIdx = getIndex(udmHeaders, ['LATITUDE', 'LAT']);
    var udmLngIdx = getIndex(udmHeaders, ['LONGITUDE', 'LONG']);
    var udmSAreaIdx = getIndex(udmHeaders, ['ASSIGNED_AREA', 'ASSIGN_AREA', 'ASSIGN AREA', 'ASSIGNED AREA']);
    var udmProIdx = getIndex(udmHeaders, ['PROVINCE']);
    var udmMCtyIdx = getIndex(udmHeaders, ['ASSIGN_CITY/MUNICIPALITY', 'TOWN']);
    var udmSAddIdx = getIndex(udmHeaders, ['SITE_ADDRESS', 'SITE_ADD', 'SITE ADDRESS', 'SITE ADD']);
    var udmTrtIdx = getIndex(udmHeaders, ['TERRITORY']);
    var udmHSvrIdx = getIndex(udmHeaders, ['HIROSHIMA SEVERITY', 'HIROSHIMA_SEVERITY']);
    var udmtwrCIdx = getIndex(udmHeaders, ['TOWERCO', 'TOWERCO NAME (ASCEO)']);

    var nms2GNameIdx = getIndex(nmsHeaders, ['2G', 'NAME']);
    var nms4GNameIdx = getIndex(nmsHeaders, ['4G', 'ENBNAME']);
    var nms5GNameIdx = getIndex(nmsHeaders, ['5G', 'GNBCUNAME']);

    var udmTable = {};
    for (let j = 1; j < udmData.length; j++) {
      if (udmNameIdx === -1) continue;
      if (udmData[j].join('').replace(/,/g, '').trim() === '') continue;

      var rawName = String(udmData[j][udmNameIdx] || '');
      var plaId = udmIdIdx > -1 ? String(udmData[j][udmIdIdx] || '').trim() : 'UNKNOWN_ID_' + j;

      var cleanedName = rawName.toUpperCase().replace(/[\s\uFEFF\xA0]/g, '');
      var invalidValues = ['', 'NA', 'NONE', 'NULL', '-'];
      var isInvalidName = invalidValues.includes(cleanedName);
      var originalUdmName = isInvalidName ? 'UNNAMED_SITE_' + plaId : rawName.trim().toUpperCase();

      var parsedUdm = extractBaseAndSuffix(originalUdmName);
      var sanitizedUdmKey = parsedUdm.cleanBase;

      var isDuplicateBase = false;
      if (udmTable[sanitizedUdmKey]) {
        sanitizedUdmKey = sanitizedUdmKey + '_DUPLICATE_' + j;
        isDuplicateBase = true;
      }

      var coords = getCoords(udmData[j], udmLatIdx, udmLngIdx);

      udmTable[sanitizedUdmKey] = {
        plaId: plaId,
        lat: coords.lat,
        lng: coords.lng,
        originalName: isInvalidName ? cleanedName || 'BLANK' : originalUdmName,
        isGhostSite: isInvalidName,
        isDuplicate: isDuplicateBase,
        allowedSuffixSet: parsedUdm.suffixSet,
        sArea: udmSAreaIdx > -1 ? udmData[j][udmSAreaIdx] : '',
        prov: udmProIdx > -1 ? String(udmData[j][udmProIdx] || '').trim().toUpperCase() : '',
        mCity: udmMCtyIdx > -1 ? udmData[j][udmMCtyIdx] : '',
        sAdd: udmSAddIdx > -1 ? udmData[j][udmSAddIdx] : '',
        trt: udmTrtIdx > -1 ? udmData[j][udmTrtIdx] : '',
        hSvr: udmHSvrIdx > -1 ? udmData[j][udmHSvrIdx] : '',
        twrC: udmtwrCIdx > -1 ? udmData[j][udmtwrCIdx] : ''
      };
    }

    var siteGroups = {};

    for (let j = 1; j < nmsData.length; j++) {
      var items = [
        { name: nms2GNameIdx > -1 ? String(nmsData[j][nms2GNameIdx] || '').trim() : '', gen: '2G' },
        { name: nms4GNameIdx > -1 ? String(nmsData[j][nms4GNameIdx] || '').trim() : '', gen: '4G' },
        { name: nms5GNameIdx > -1 ? String(nmsData[j][nms5GNameIdx] || '').trim() : '', gen: '5G' }
      ].filter(i => i.name !== '');

      items.forEach(item => {
        var parsed = extractBaseAndSuffix(item.name);
        var bName = parsed.cleanBase;
        if (!bName) return;

        if (!siteGroups[bName]) {
          siteGroups[bName] = {
            displayBase: parsed.displayBase,
            suffixes: new Set(),
            originalEntries: []
          };
        }

        siteGroups[bName].originalEntries.push({ rawName: item.name, baseGen: item.gen, suffix: parsed.suffix });

        for (let char of parsed.suffix) {
          siteGroups[bName].suffixes.add(char.toUpperCase());
        }
      });
    }

    var report = [];
    var matchedUdmKeys = new Set();

    for (var bName in siteGroups) {
      var group = siteGroups[bName];
      var udmRowMatch = udmTable[bName];

      var status = 'NEW';
      var remarks = 'Synthesized from NMS.';
      var inferredLocation = udmRowMatch ? null : inferLocation(group.displayBase);

      if (udmRowMatch) {
        matchedUdmKeys.add(bName);

        var nmsSet = group.suffixes;
        var udmSet = udmRowMatch.allowedSuffixSet;

        var isSameSize = nmsSet.size === udmSet.size;
        var hasAll = Array.from(nmsSet).every(char => udmSet.has(char));

        if (isSameSize && hasAll) {
          status = 'UNCHANGED';
          remarks = 'Site BCF validated perfectly against UDM.';
        } else {
          status = 'MISMATCH';
          remarks = `BCF Mismatch: UDM expects [${udmRowMatch.originalName}].`;
        }
      }

      group.originalEntries.forEach(entry => {
        var specificTechLabel = generateSpecificTechLabel(entry.baseGen, entry.suffix);

        report.push({
          plaId: udmRowMatch ? udmRowMatch.plaId : 'NEW_SITE',
          matchStatus: status,
          techName: entry.rawName,
          baseLocation: group.displayBase,
          techGen: specificTechLabel,
          nmsName: entry.rawName,
          lat: udmRowMatch ? udmRowMatch.lat : '',
          lng: udmRowMatch ? udmRowMatch.lng : '',
          sArea: udmRowMatch ? udmRowMatch.sArea : inferredLocation.area,
          prov: udmRowMatch ? udmRowMatch.prov : provinceNew(entry.rawName),
          mCity: udmRowMatch ? udmRowMatch.mCity : cityNew(entry.rawName),
          sAdd: udmRowMatch ? udmRowMatch.sAdd : '',
          trt: udmRowMatch ? udmRowMatch.trt : '',
          hSvr: udmRowMatch ? udmRowMatch.hSvr : '',
          twrC: udmRowMatch ? udmRowMatch.twrC : towerC(entry.rawName),
          region: dict(udmRowMatch ? udmRowMatch.prov : provinceNew(entry.rawName)),
          remarks: remarks
        });
      });
    }

    for (var udmKey in udmTable) {
      if (!matchedUdmKeys.has(udmKey)) {
        var u = udmTable[udmKey];
        var removedParsed = extractBaseAndSuffix(u.originalName);
        var forceUnique = u.isGhostSite || u.isDuplicate;
        var uniqueDisplayBase = forceUnique ? u.originalName + ' (' + u.plaId + ')' : removedParsed.displayBase;
        
        var baseGen = '2G';
        var str = removedParsed.suffix.toUpperCase();
        if (/[FLWYHV]/.test(str)) {
          baseGen = '4G';
        } else if (/[MPN]/.test(str)) {
          baseGen = '5G';
        }

        var specificTechLabel = generateSpecificTechLabel(baseGen, removedParsed.suffix);

        report.push({
          plaId: u.plaId,
          matchStatus: 'REMOVED',
          techName: forceUnique ? uniqueDisplayBase : u.originalName,
          baseLocation: uniqueDisplayBase,
          techGen: specificTechLabel,
          nmsName: forceUnique ? uniqueDisplayBase : u.originalName,
          lat: u.lat,
          lng: u.lng,
          prov: u.prov,
          remarks: u.isGhostSite ? 'UDM BCF Name was blank/missing.' : (u.isDuplicate ? 'CRITICAL: UDM Database Collision! Multiple PLA_IDs share this exact BCF Name.' : 'Site BCF found in UDM but missing from NMS.'),
          sArea: u.sArea,
          mCity: u.mCity,
          sAdd: u.sAdd,
          trt: u.trt,
          hSvr: u.hSvr,
          twrC: u.twrC,
          region: dict(u.prov)
        });
      }
    }

    return { success: true, data: report, count: report.length };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}
