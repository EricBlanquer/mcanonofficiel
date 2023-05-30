const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const COLORS = ['Bleu', 'Noir', 'Rouge', 'Vert'];
const ACTIVITY_LABELS = {
  'Aquabiking': 'aqua<b>biking</b>',
  'Aquaboxing': 'aqua<b>boxing</b>',
  'Aquafitness': 'aqua<b>fitness</b>',
  'Aquafusion': 'aqua<b>fusion</b>',
  'Bodypalm': 'body<b>palm</b>',
  'Bodysculpt': 'Body<b>sculpt</b>',
  'Caf': 'caf',
  'Danse': 'L.I.A.',
  'Hbx Boxing': 'BOXING HBX',
  'Vélaqua': 'vel<b>aqua</b>',
};
const PRICE_LABELS = {
  'Tarif carte de 10': 'carte'
};
const URL_EP_PROFIL = '/espace-perso/profil/';
const URL_EP_RESERVATIONS = '/espace-perso/reservations/';
const URL_MI_ACTIVITY = '/module-inscriptions/activite/?activite=';
const URL_MI_ACTIVITIES = '/module-inscriptions/activites/';
const URL_MI_CENTER = '/module-inscriptions/?centre=';
const URL_MI_INFOS = '/module-inscriptions/infos/';
const URL_MI_RESERVATIONS = '/module-inscriptions/reservations/'
const URL_MI_RESERVATIONS_CANCEL = '/espace-perso/reservations/?action=annuler_reservation&reservation=';
const URL_MI_RESERVATIONS_REMOVE = '/module-inscriptions/reservations/?action=supprimer&reservation=';
const URL_MI_SLOTS = '/module-inscriptions/creneaux/?periode=';
const URL_MI_SLOTS_ADD = '/module-inscriptions/creneaux/';
window.addEventListener('load', doOnLoad);
window.onerror = doOnError;
let jsonActivities = JSON.parse(localStorage.getItem('jsonActivities') || '{}');
let jsonSlotsPerActivityID = JSON.parse(localStorage.getItem('jsonSlotsPerActivityID') || '{}');
let currentActivityCount, totalActivitiesCount;
var activitiesByPriceName = {};
var activityIDByActivityName = {};
var reservationByID = {};
var dates = {};
var profil = {};

async function doOnLoad() {
  console.log('doOnLoad');
  let logoutButton = $('a[href="/espace-perso/deconnexion"]');
  if (logoutButton.length) {
    logoutButton.before('<a id="mcano_planning" href="javascript:void(0)">\
      <figure>\
        <img src="' + getURL('images/mcano_planning.png') + '" />\
      </figure>\
    </a>');
    $('img[src$="account.svg"]').attr('src', getURL('images/account.png'));
    $('input[readonly]').removeAttr('readonly');
    $('#mcano_planning').click(getProfil);
    setTimeout(function() {
      $(window).scrollTop(0);
    }, 100);
  }
  else {
    let emailInput = $('input[name="email"]');
    if (emailInput.length) {
      $(window).scrollTop(emailInput.closest('div').offset().top);
    }
  }
}

function getProfil() {
  console.log('getProfil');
  fetchUrl(URL_EP_PROFIL)
    .then(response => response.text())
    .then(doOnProfil)
    .then(doOnPlanningclick);
}

function doOnProfil(body) {
  console.log('doOnProfil');
  profil.firstName = $(body).find('input[name=prenom]').val();
  profil.lastName = $(body).find('input[name=nom]').val();
  console.log('doOnProfil', profil);
  if (!profil.firstName && !profil.lastName) {
    document.location.reload();
  }
}

async function doOnPlanningclick() {
  console.log('doOnPlanningclick');
  if (localStorage.getItem('selectedCenter')) {
    await setCenter();
    await checkActivities();
  }
  else {
    await getCenters();
  }
}

async function checkActivities(event) {
  console.log('checkActivities', event);
  let activities = [];
  if (!event) {
    for (var i = 0; i < localStorage.length; i++) {
      let key = localStorage.key(i);
      if (key.substring(0, 'activity'.length) == 'activity' && localStorage.getItem(key) === 'true') {
        activities.push(key.substring('activity'.length));
      }
    }
  }
  let title;
  if (activities.length) {
    title = 'mise à jour des activités sélectionnées';
  }
  else {
    title = 'récupération de la liste des toutes les activités ainsi que leur tarifs';
  }
  dialog('mcano_content', '<div id="mcano_content" title="activités">\
    <br/>\
    ' + title + '<br />\
    <br />\
    <p style="text-align:center">veuillez patienter</p>\
    <br />\
    <p style="text-align:right"><span id="progressValue"></span></p>\
    <p><div id="progressbar"></div></p>\
  </div>');
  $('#progressbar').progressbar({value: 0});
  await getActivities();
  let length = activities.length;
  if (length) {
    for (var i = 0; i < length; i++) {
      let activity = activities[i];
      let name = ((jsonActivities[activity] || {}).description || [''])[0];
      console.log('checking if another activity match this activity name', activity, name, jsonActivities);
      $(Object.keys(jsonActivities)).each(function (cpt, element) {
        if (element != activity && (jsonActivities[element].description || [''])[0] == name) {
          console.log('another activity found with the same name', activity, jsonActivities[activity], element, jsonActivities[element]);
          activities.push(element);
        }
      });
    }
  }
  else {
    activities = Object.keys(jsonActivities);
  }
  currentActivityCount = 0;
  totalActivitiesCount = activities.length;
  for (var i = 0; i < activities.length; i++) {
    let activity = activities[i];
    await getActivity(activity);
  }
}

async function getCenters() {
  console.log('getCenters');
  let response = await fetchUrl(URL_MI_CENTER);
  await doOnGetCenters(await response.text());
}

async function setCenter() {
  console.log('setCentre');
  let center = localStorage.getItem('selectedCenter');
  await fetchUrl(URL_MI_CENTER + center);
}

async function doOnGetCenters(body) {
  console.log('doOnGetCenters');
  let centers = {};
  $(body).find('#liste_centres tr').each(function (cpt, element) {
    let row = $(element);
    let description = explodeTrim(row);
    centers[description[0]] = {
      description: description,
      logo: row.find('img').attr('src'),
      id: row.find('a').attr('href').substring(URL_MI_CENTER.length)
    };
  });
  console.log(centers);
  let keys = Object.keys(centers);
  if (keys.length) {
    let html = '<div id="mcano_content" title="Je choisis mon centre">';
    $(keys).sort().each(function (cpt, element) {
      let center = centers[element];
      html += '<a href="javascript:void(0)" center="' + center.id +'">\
        <table class="mcano_center"><tbody><tr><td>\
          <img src="' + center.logo + '" class="centerLogo" />\
      </td><td>\
        ' + center.description.join('<br />') + '\
      </td></tr></tbody></table>\
      </a>';
    })
    html += '</div>';
    dialog('mcano_content', html);
    $('#mcano_content a').click(doOnCenterClick);
  }
  else {
    localStorage.setItem('selectedCenter', 42);
    await doOnPlanningclick();
  }
}

async function doOnCenterClick(event) {
  console.log('doOnCenterClick', event);
  $('#mcano_centers').dialog('close').remove();
  let center = $(event.target).closest('a').attr('center');
  localStorage.setItem('selectedCenter', center);
  await doOnPlanningclick();
}

async function getActivities() {
  console.log('getActivities');
  let response = await fetchUrl(URL_MI_ACTIVITIES);
  jsonActivities = await doOnActivities(await response.text());
  localStorage.setItem('jsonActivities', JSON.stringify(jsonActivities));
}

async function doOnActivities(body) {
  console.log('doOnActivities');
  return parseActivities(body);
}

function parseActivities(body) {
  console.log('parseActivities');
  let result = {};
  $(body).find('a[href^="' + URL_MI_ACTIVITY + '"]').each(function (cpt, element) {
    let id = $(element).attr('href').substring(URL_MI_ACTIVITY.length);
    if (!result[id]) {
      result[id] = {};
    }
    let row = $(element).closest('.tr_activite')
    let description = explodeTrim(row);
    result[id].description = description;
    row.find('td[style]').each(function(cpt, element) {
      $cell = $(element);
      let background = $cell.css('background');
      if (background) {
        let pos = background.indexOf('/');
        background = background.substring(pos);
        pos = background.indexOf(')');
        background = background.substring(0, pos);
        result[id].image = background;
      }
    });
  });
  console.log('parseActivities', result);
  return result;
}

async function getActivity(activity, levelOption) {
  console.log('getActivity', activity, levelOption);
  beforeParseActivity(activity)
  let url = URL_MI_ACTIVITY + activity;
  if (levelOption) {
    url += '&niveau=' + levelOption.value;
  }
  let response = await fetchUrl(url);
  await doOnActivity(activity, levelOption, await response.text());
  await checkProgress(activity);
}

async function doOnActivity(activity, levelOption, body) {
  console.log('doOnActivity', activity, levelOption);
  let $levelOptions = $(body).find('#liste_niveaux option');
  if (levelOption === void(0) && $levelOptions.length) {
    for (var i = 0; i < $levelOptions.length; i++) {
      let element = $levelOptions[i];
      if (element.value !== '0') {
        await getActivity(activity, element);
      }
    }
  }
  else {
    periodOptions = $(body).find('#liste_periodes option');
    for (var i = 0; i < periodOptions.length; i++) {
      let element = periodOptions[i];
      if (element.value !== '0') {
        await getPeriod(activity, levelOption, element);
      }
    }
  }
}

async function getPeriod(activity, levelOption, periodOption) {
  console.log('getPeriod', activity, levelOption, periodOption);
  let url = URL_MI_ACTIVITY + activity + '&periode=' + periodOption.value;
  if (levelOption) {
    url += '&niveau=' + levelOption.value;
  }
  let response = await fetchUrl(url);
  await doOnPeriod(activity, levelOption, periodOption, await response.text());
}

async function doOnPeriod(activity, levelOption, periodOption, body) {
  console.log('doOnPeriod', activity, levelOption, periodOption);
  let $priceOptions = $(body).find('#liste_tarifs option');
  for (var i = 0; i < $priceOptions.length; i++) {
    let element = $priceOptions[i];
    if (element.value !== '0' && $(element).text().substring(0, 'Tarif adulte'.length) != 'Tarif adulte') {
      await getPrice(activity, levelOption, periodOption, element);
    }
  }
}

async function getPrice(activity, levelOption, periodOption, priceOption) {
  console.log('getPrice', activity, levelOption, periodOption, priceOption);
  let url = URL_MI_SLOTS + periodOption.value + '&activite=' + activity + '&tarif=' + priceOption.value;
  if (levelOption) {
    url += '&niveau=' + levelOption.value;
  }
  let response = await fetchUrl(url);
  await doOnPrice(activity, levelOption, periodOption, priceOption, await response.text());
}

async function doOnPrice(activity, levelOption, periodOption, priceOption, body) {
  console.log('doOnPrice', activity, levelOption, periodOption, priceOption);
  await parsePrices(activity, levelOption, periodOption, priceOption, body);
}

async function parsePrices(activity, levelOption, periodOption, priceOption, body) {
  console.log('parsePrices', activity, levelOption, periodOption, priceOption);
  let prefix = 'afficher_popup_reserver(';
  if (!jsonSlotsPerActivityID[activity]) {
    jsonSlotsPerActivityID[activity] = {periods: {}};
  }
  $(body).find('img[onclick]').each(function (cpt, element) {
    let img = $(element);
    let onclick = img.attr('onclick');
    if (onclick.startsWith(prefix)) {
      let data = {};
      data.src = img.attr('src');
      let id = onclick.substring(prefix.length).split(',', 2)[0];
      let parent = img.closest('td');
      let previous = parent.prev('td');
      data.description = explodeTrim(previous);
      parent = previous.parent().closest('td');
      previous = parent.prev('td');
      if (levelOption) {
        data.level = $(levelOption).text().trim(); 
      }
      data.period = $(periodOption).text().trim(); 
      data.price = $(priceOption).text().trim(); 
      data.dateSource = explodeTrim(previous);
      if (data.dateSource[1]) {
        let dateParts = data.dateSource[1].split('/');
        data.date = dateParts[2] + '/' + dateParts[1] + '/' + dateParts[0];
      }
      else if (data.dateSource[0]) {
        let day = data.dateSource[0].toLowerCase();
        data.date = extractDates(data.period)[day];
      }
      if (!jsonSlotsPerActivityID[activity].periods[periodOption.value]) {
        jsonSlotsPerActivityID[activity].periods[periodOption.value] = {prices: {}};
      }
      if (!jsonSlotsPerActivityID[activity].periods[periodOption.value].prices[priceOption.value]) {
        jsonSlotsPerActivityID[activity].periods[periodOption.value].prices[priceOption.value] = {reservations: {}};
      }
      jsonSlotsPerActivityID[activity].periods[periodOption.value].prices[priceOption.value].reservations[id] = data;  
  }
  });
}
async function beforeParseActivity(activity) {
  console.log('beforeParseActivity', activity);
  let value = Math.ceil(currentActivityCount / totalActivitiesCount * 100);
  $('#progressValue').text(((jsonActivities[activity] || {}).description || [''])[0] + ' : ' + value + '%');
  $('#progressbar').progressbar({value: value});
}

async function checkProgress(activity) {
  console.log('checkProgress', activity);
  currentActivityCount++;
  let value = Math.ceil(currentActivityCount / totalActivitiesCount * 100);
  $('#progressValue').text(((jsonActivities[activity] || {}).description || [''])[0] + ' : ' + value + '%');
  $('#progressbar').progressbar({value: value});
  if (currentActivityCount == totalActivitiesCount) {
    setTimeout(doOnGetActivity, 100);
  }
}

async function doOnGetActivity() {
  $('#progressZone').dialog('close').remove();
  console.log('jsonSlotsPerActivityID', jsonSlotsPerActivityID);
  localStorage.setItem('jsonSlotsPerActivityID', JSON.stringify(jsonSlotsPerActivityID));
  checkPrices();
}

async function checkPrices() {
  console.log('checkPrices');
  console.log('jsonSlotsPerActivityID', jsonSlotsPerActivityID);
  console.log('jsonActivities', jsonActivities);
  sortActivities();
}

function sortActivities() {
  console.log('sortActivities');
  let hasPricesSelected = false;
  for (var activityID in jsonSlotsPerActivityID) {
    let periods = jsonSlotsPerActivityID[activityID].periods
    for (var periodID in periods) {
      let period = periods[periodID];
      let prices = period.prices;
      for (var priceID in prices) {
        let reservations = prices[priceID].reservations;
        for (var reservationID in reservations) {
          let reservation = reservations[reservationID];
          reservation.activity = ((jsonActivities[activityID] || {}).description || [''])[0];
          reservation.activityID = activityID;
          reservation.periodID = periodID;
          reservation.priceID = priceID;
          reservation.reservationID = reservationID;
          let date = reservation.date;
          if (date && new Date(date).getTime() >= new Date().setHours(0, 0, 0, 0)) {
            if (!dates[date]) {
              dates[date] = {};
            }
            let time = reservation.description[0];
            if (!dates[date][time]) {
              dates[date][time] = {};
            }
            let price = reservation.price;
            if (!dates[date][time][price]) {
              dates[date][time][price] = {};
            }
            dates[date][time][price][reservationID] = reservation;
            if (!activitiesByPriceName[price]) {
              activitiesByPriceName[price] = [];
            }
            if (activitiesByPriceName[price].indexOf(reservation.activity) == -1) {
              activitiesByPriceName[price].push(reservation.activity);
            }
            if (localStorage.getItem('price' + getHtmlID(price.split(' (')[0])) === 'true') {
              hasPricesSelected = true;
            }
            activityIDByActivityName[reservation.activity] = activityID;
          }
        }
      }
    }
  }
  console.log('activitiesByPriceName', activitiesByPriceName);
  if (hasPricesSelected) {
    displayActivities();
  }
  else {
    displayPrices();
  }
}

function displayPrices() {
  console.log('displayPrices', activitiesByPriceName);
  let html = '<div id="mcano_content" title="Tarifs">\
    <table align="center">\
      <caption><br/>\
        Sélectionnez le(s) tarif(s) des activités que vous souhaitez réserver<br/>\
        puis cliquez sur le bouton "activités >" en bas de la page<br/>\
        <br/>\
        <button id="refreshButton">rafraichir les tarifs</button><br/>\
        <br/>\
      </caption>\
    <tbody>';
  for (var price in activitiesByPriceName) {
    html += '<tr><td valign="top">';
    let id = 'price' + getHtmlID(price.split('(', 2)[0].trim());
    html += '<input type="checkbox" id="' + id + '" value="' + id + '"';
    let checked = localStorage.getItem(id) === 'true';
    if (checked) {
      html += ' checked="checked"';
    }
    html += ' />';
    let parts = price.split(' (', 2);
    html += '<label for="' + id + '" style="width:80%;text-align:left">' + parts[0] + '</label><br/>';
    if (parts[1]) {
      html += '<i>' + parts[1].replace(')', '') + '</i>';
    }
    html += '</td><td>';
    let activities = activitiesByPriceName[price];
    html += activities.sort().join('<br/>');
    html += '</td></tr>';
  }
  html += '</tbody>\
    <tfoot>\
      <tr>\
        <td colspan="2" align="right"><button id="nextButton">activités &gt;</button></td>\
      </tr>\
    </tfoot>\
  </table>\
  </div>';
  dialog('mcano_content', html);
  $('#mcano_content input').checkboxradio().click(doOnCheckboxClick);
  $('#nextButton').button().click(displayActivities);
  $('#refreshButton').button().click(doOnRefresh);
}

function doOnRefresh() {
  console.log('doOnRefresh', localStorage.length);
  let keys = [];
  for (var i = 0; i < localStorage.length; i++) {
    let key = localStorage.key(i);
    if (key.substring(0, 'json'.length) == 'json' || key.substring(0, 'price'.length) == 'price' || key.substring(0, 'activity'.length) == 'activity') {
      keys.push(key);
    }
  }
  $(keys).each(function(cpt, element) {
    localStorage.removeItem(element);
  });
  jsonActivities = {};
  jsonSlotsPerActivityID = {};
  console.log('doOnRefresh', localStorage);
  checkActivities();
}

function displayActivities(event) {
  console.log('displayActivities', event);
  if (event && $('input[id^=price]').length && !$('input[id^=price]:checked').length) {
    return;
  }
  let selectedActivities = [];
  for (var price in activitiesByPriceName) {
    let id = 'price' + getHtmlID(price.split('(', 2)[0].trim());
    let checked = localStorage.getItem(id) === 'true';
    if (checked) {
      let priceActivities = activitiesByPriceName[price];
      $(priceActivities).each(function (cpt, element) {
        if (selectedActivities.indexOf(element) == -1) {
          selectedActivities.push(element);
        }
      });
    }
  }
  let hasActivitiesSelected = false;
  $(selectedActivities).sort().each(function (cpt, element) {
    let activityID = activityIDByActivityName[element];
    let id = 'activity' + activityID;
    let checked = localStorage.getItem(id) === 'true';
    if (checked) {
      hasActivitiesSelected = true;
    }
  });
  if (hasActivitiesSelected && !event) {
    displayPlanning();
  }
  else {
    let html = '<div id="mcano_content" title="activités">\
      <table align="center">\
      <caption><br/>\
        Sélectionnez les activités que vous souhaitez réserver<br/>\
        puis cliquez sur le bouton "planning >" en bas de la page<br/>\
        </caption>\
      <thead>\
        <tr>\
          <th align="left">\
            <button id="previousButton">&lt; tarifs</button>\
          </th><th>\
            <button id="showDescription">';
    let showDescription = localStorage.getItem('showDescription') === 'true';
    if (showDescription) {
      html += 'cacher les descriptions';
    }
    else {
      html += 'montrer les descriptions';
    }
    html += '</button>\
        </th></tr>\
      </thead>\
    <tbody>';
    $(selectedActivities).sort().each(function (cpt, element) {
      let activityID = activityIDByActivityName[element];
      let activity = jsonActivities[activityID];
      if (activity) {
        let id = 'activity' + activityID;
        html += '<tr><td valign="top">';
        html += '<input type="checkbox" id="' + id + '" value="' + id + '"';
        let checked = localStorage.getItem(id) === 'true';
        if (checked) {
          html += ' checked="checked"';
        }
        html += ' />';
        html += '<label for="' + id + '" style="white-space:nowrap;width:90%;text-align:left">';
        html += (activity.description || [''])[0];
        html += '</label><br/>';
        let image = activity.image;
        if (image) {
          html += '<div class="description" style="text-align:center;width:90%;padding:10px';
          if (!showDescription) {
            html += ';display:none';
          }
          html += '">';
          html += '  <img title="" src="' + image + '" style="width:100%" />';
          html += '</div>';
        }
        html += '</td><td valign="top">';
        html += '<div class="description"';
        if (!showDescription) {
          html += ' style="display:none"';
        }
        html += '>';
        html += (activity.description || ['']).slice(1, -1).join('<br/>');
        html += '</div>';
        html += '</td></tr>';
      }
    });
    html += '</tbody>';
    html += '<tfoot>';
    html += '<tr>';
    html += '<td colspan="2" align="right"><button id="nextButton">planning &gt;</button></td>';
    html += '</tr>';
    html += '</tfoot>';
    html += '</table>';
    html += '</div>';
    dialog('mcano_content', html);
    $('#mcano_content input').checkboxradio().click(doOnCheckboxClick);
    $('#previousButton').button().click(displayPrices);
    $('#nextButton').button().click(function () {
      checkActivities();
    });
    $('#showDescription').button().click(function(event) {
      $('.description').stop(false, true);
      if ($(event.target).text() == 'cacher les descriptions') {
        localStorage.setItem('showDescription', 'true');
        $('.description:visible').slideToggle('fast', function() {
          $('#showDescription').text('montrer les descriptions');
        });
      }
      else {
        localStorage.setItem('showDescription', 'false');
        $('.description:hidden').slideToggle('fast', function() {
          $('#showDescription').text('cacher les descriptions');
        });
      }
    });
  }
}

function displayPlanning() {
  console.log('displayPlanning', dates);
  if ($('input[id^=activity]').length && !$('input[id^=activity]:checked').length) {
    return;
  }
  let html = '<div id="mcano_content" title="Planning">';
  html += '<button id="previousButton">&lt; activités</button>';
  html += '<div id="accordion">';
  html += '<h3 id="reservationTab">';
  html += 'réservations';
  html += '<button id="validate" class="pending">';
  html += '<span class="single">je finalise ma réservation</span>';
  html += '<span class="multiple">je finalise mes réservations</span>';
  html += '</button>';
  html += '</h3>';
  html += '<div id="reservationZone">';
  html += '<table id="iBookFor"><tbody><tr>';
  html += '<td>je réserve pour&nbsp;</td>';
  let iBookForFirstName = localStorage.getItem('iBookForFirstName') || profil.firstName;
  let iBookForLastName = localStorage.getItem('iBookForLastName') || profil.lastName;
  html += '<td><input id="iBookForFirstName" type="text" value="' + iBookForFirstName + '" /></td>'
  html += '<td>&nbsp;<input id="iBookForLastName" type="text" value="' + iBookForLastName + '" /></td>'
  html += '</tr></tbody></table>';
  html += '<div id="reservationsZone"></div>';
  html += '</div>';
  html += '</div>';
  html += '<div style="overflow-x:scroll;padding:40px 0 20px 0">';
  html += '<div id="planning">';
  html += '<table class="planning">';
  html += '<thead class="headers"><tr>';
  let keys  = Object.keys(dates).sort();
  $(keys).each(function(cpt, element) {
    let today = new Date();
    let date = new Date(element);
    let label = DAYS[date.getDay()] + ' ' + date.getDate() + '/' + (date.getMonth() + 1);
    html += '<th class="day' + getHtmlID(element) + '" style="display:none">';
    html += '<span';
    if (today.getDate() == date.getDate() && today.getMonth() == date.getMonth()) {
      html += ' class="today"';
    }
    html += '>' + label + '</span>';
    html += '</th>';
  });
  html += '</tr></thead>';
  html += '<tbody><tr>';
  $(keys).each(function (cpt, element) {
    let hours = dates[element];
    let dayClassName = 'day' + getHtmlID(element);
    html += '<td class="' + dayClassName + '" valign="top" style="display:none">';
    $(Object.keys(hours)).sort().each(function (cpt, element) {
      let hourClassName = dayClassName + '_' + getHtmlID(element);
      let prices = hours[element];
      html += '<fieldset class="' + hourClassName + '" style="display:none">';
      html += '<legend>' + element + '</legend>';
      $(Object.keys(prices)).sort().each(function (cpt, element) {
        let slots = prices[element];
        $(Object.keys(slots)).sort().each(function (cpt, element) {
          let slot = slots[element];
          console.log('displayPlanning slot', slot);
          let activity = slot.level ? slot.level : slot.activity;
          let price = slot.price.split('(', 2)[0].trim();
          let activityID = 'activity' + slot.activityID;
          let priceID = 'price' + getHtmlID(price);
          let className = 'slot ' + getHtmlID(activity) + ' ' + activityID + ' ' + priceID;
          className += ' ' + (iBookForFirstName + ' ' + iBookForLastName).toLowerCase();
          html += '<table class="' + className + '" style="width:100%';
          let activityChecked = localStorage.getItem(activityID) === 'true';
          let priceChecked = localStorage.getItem(priceID) === 'true';
          if (!activityChecked || !priceChecked) {
            html+= ';display:none';
          }
          html += '"><tbody><tr>';
          html += '<td><span class="slotName ' + activity + '">';
          let label = activity;
          for (var i = 0; i < COLORS.length; i++) {
            let color = COLORS[i];
            if (label.endsWith(' ' + color)) {
              label = label.substring(0, label.length - color.length - 1);
            }
          }
          html += ACTIVITY_LABELS[label] || label;
          html += '</span></td>';
          html += '<td style="width:1%">';
          html += '<span class="price">' + (PRICE_LABELS[price] || price).replace('Tarif ', '') + '&nbsp;</span>';
          html += '<span class="reservations_count">' + slot.description[2] + '</span>';
          html += '</td>';
          html += '<td style="width:1%">';
          html += '<img title="' + slot.description[2] +'" src="' + slot.src + '" class="slotStatus" slot="' + element + '" activity="' + slot.activityID + '" period="' + slot.periodID + '" />';
          html += '<img title="' + slot.description[2] +'" src="' + getURL('images/remove.png') + '" class="cancel" />';
          html += '</td>';
          html += '</tr></tbody></table>';
        });
      });
      html += '</fieldset>';
    });
    html += '</td>';
  });
  html += '</tr></tbody>';
  html += '</table>';
  html += '</div>';
  html += '</div>';
  dialog('mcano_content', html, {width: '100%'});
  $('#planning img[src="/module-inscriptions/images/planning-vert.svg"]').click(addReservation);
  $('#planning img[src$="images/remove.png"]').click(removeReservation);
  $('#accordion').accordion({
    heightStyle: 'content',
    active: false,
    collapsible: true
  });
  doOnCheckboxClick();
  fetchReservations();
  $('#validate').button().click(doOnValidate);
  $('#previousButton').button().click(displayActivities);
  $('#iBookForFirstName,#iBookForLastName').change(doOnIBookForChange);
  $('input').blur();
}

function doOnIBookForChange(event) {
  console.log('doOnIBookForChange', event);
  if (event.target.value === '') {
    if (event.target.id === 'iBookForFirstName') {
      $('#iBookForFirstName').val(profil.firstName);
    }
    else {
      $('#iBookForLastName').val(profil.lastName);
    }
  }
  if (event.target.id === 'iBookForFirstName') {
    localStorage.setItem('iBookForFirstName', $('#iBookForFirstName').val());
  }
  else {
    localStorage.setItem('iBookForLastName', $('#iBookForLastName').val());
  }
  let iBookForFirstName = localStorage.getItem('iBookForFirstName') || profil.firstName;
  let iBookForLastName = localStorage.getItem('iBookForLastName') || profil.lastName;
  let planningFor = getHtmlID(iBookForFirstName + ' ' + iBookForLastName);
  let planningForName = getHtmlID(iBookForFirstName);
  if ($('#planning .confirmed, #planning .pending').length || $('.confirmed[for="' + planningFor + '"], .pending[for="' + planningForName + '"]').length) {
    checkActivities();
  }
}

function doOnCheckboxClick(event) {
  console.log('doOnCheckboxClick', event);
  let selectedPrices = [];
  if (event) {
    let target = event.target;
    localStorage.setItem(target.value, target.checked);
    if (target.value.substring(0, 'price'.length) == 'price') {
      let keys = [];
      for (var i = 0; i < localStorage.length; i++) {
        let key = localStorage.key(i);
        if (key.substring(0, 'activity'.length) == 'activity') {
          keys.push(key);
        }
      }
      $(keys).each(function(cpt, element) {
        localStorage.removeItem(element);
      });
    }
  }
  for (var i = 0; i < localStorage.length; i++) {
    let key = localStorage.key(i);
    if (key.substring(0, 'price'.length) == 'price' && localStorage.getItem(key) === 'true') {
      selectedPrices.push(localStorage.getItem(key));
    }
  }
  if (selectedPrices.length == 1) {
    $('.price').hide();
  }
  else {
    $('.price').show();
  }
  $('.slot').each(function(cpt, element) {
    slot = $(element);
    let isVisible = true;
    $(slot.attr('class').split(' ')).each(function(cpt, element) {
      if (element.substring(0, 'activity'.length) == 'activity' || element.substring(0, 'price'.length) == 'price') {
        isVisible &= localStorage.getItem(element) === 'true';
      }
    });
    if (isVisible) {
      let td = slot.show().closest('fieldset').show().closest('td').show();
      $('th.' + td.attr('class')).show();
    }
    else {
      let td = slot.hide()
      let fieldset = slot.closest('fieldset');
      let crenaux = fieldset.find('.slot:visible');
      if (!crenaux.length) {
        fieldset.hide();
        let td = fieldset.closest('td');
        crenaux = td.find('.slot:visible');
        if (!crenaux.length) {
          td.hide();
          $('th.' + td.attr('class')).hide();
        }
      }
    }
  });
}

async function fetchReservations() {
  console.log('fetchReservations');
  let response = await fetchUrl(URL_EP_RESERVATIONS);
  let json = await parseAllReservations(await response.text());
  doOnReservations(json);
  $('#mcano_content img[src$="images/remove.png"]').unbind('click', removeReservation).click(removeReservation);
}

async function parseAllReservations(body) {
  console.log('parseAllReservations');
  let result = parseReservations(body, 'div_reservations_en_cours');
  result = {...result, ...parseReservations(body, 'div_reservations_terminees')};
  result.pending = await listPendingReservations();
  console.log('parseAllReservations'), result;
  return result;
}

function parseReservations(body, id) {
  console.log('parseReservations', id);
  let result = {};
  let prefix = 'reservation_';
  let divs = $(body).find('#' + id + ' div[id^=' + prefix + ']');
  $(divs).each(function (cpt, element) {
    let trs = $(element).find('tr');
    let data = {};
    $(trs).each(function (cpt, element) {
      let nodeValues = $(element).text().split(':');
      if (nodeValues.length == 2) {
        let key = nodeValues[0].trim();
        let value = explodeTrim(nodeValues[1]);
        data[key] = value;
        if (key == 'Activité') {
          value = value[0];
          let pos = value.indexOf(' le ');
          if (pos != -1) {
            let activity = value.substring(0, pos);
            value = value.substring(pos + ' le '.length);
            pos = value.indexOf(' ');
            let day = value.substring(0, pos);
            value = value.substring(pos + ' '.length);
            pos = value.indexOf(' ');
            let date = value.substring(0, pos);
            value = value.substring(pos + ' de '.length);
            pos = value.indexOf(' (');
            let hours = value.substring(0, pos);
            value = value.substring(pos + ' ('.length);
            pos = value.indexOf(')');
            let duration = value.substring(0, pos);
            data['activity'] = activity;
            data['day'] = day;
            parts = date.split('/');
            data['date'] = parts[2] + '/' + parts[1] + '/' + parts[0];
            data['hours'] = hours;
            data['duration'] = duration;
            console.log('parseReservations', id, data);
          }
        }
      }
    });
    if (new Date(data['date']).getTime() >= new Date().setHours(0, 0, 0, 0)) {
      result[element.id.substring(prefix.length)] = data;
    }
  });
  console.log('parseReservations', id, result);
  return result;
}

async function listPendingReservations() {
  console.log('listPendingReservations');
  let result = {};
  let body = await fetchUrl(URL_MI_RESERVATIONS)
    .then(response => response.text());
  let prefix = '/module-inscriptions/reservations/?action=supprimer&reservation=';
  let links = $(body).find('a[href^="' + prefix + '"]');
  $(links).each(function (cpt, element) {
    let link = $(element);
    let href = link.attr('href');
    let id = href.substring(prefix.length).split('&')[0];
    let data = {};
    let period = '';
    let date = {};
    let offset = 0;
    let tr = link.closest('tr');
    let previousTr = tr.prev();
    if (previousTr.find('td:first').attr('colspan') == 4) {
      let spans = previousTr.find('span');
      $(spans).each(function (cpt, element) {
        offset = cpt + 1;
        let span = $(element);
        data[cpt] = explodeTrim(span);
        let text = span.text().toLowerCase();
        if (text.startsWith('semaine du ')) {
          period = text;
        }
      });
    }
    let spans = tr.find('span');
    $(spans).each(function (cpt, element) {
      let span = $(element);
      data[cpt + offset] = explodeTrim(span);
      let text = span.text().toLowerCase();
      if (text.startsWith('réservation pour ')) {
        let td = span.closest('td');
        date = explodeTrim(td);
        data['day'] = date[0];
      }
      else if (text.startsWith('semaine du ')) {
        period = text;
      }
    });
    if (period && date) {
      data['date'] = computeDate(date, period);
    }
    result[id] = data;
  });
  console.log('listPendingReservations', result);
  return result;
}

function computeDate(date, period) {
  console.log('computeDate', date, period);
  let day = date[0].toLowerCase();
  return extractDates(period)[day];
}

function extractDates(period) {
  console.log('extractDates', period);
  let result = {};
  let fromTo = period.substring('semaine du '.length);
  let fromToParts = fromTo.split(' ');
  console.log('extractDates fromToParts', fromToParts);
  let fromDate = fromToParts[0];
  let fromDateParts = fromDate.split('/');
  console.log('extractDates fromDateParts', fromDateParts);
  if (fromDateParts.length > 1) {
    let year = getYear(fromDateParts[1]);
    for (var i = 0; i < DAYS.length; i++) {
      let strDate = year + '/' + fromDateParts[1] + '/' + fromDateParts[0];
      result = {...result, ...getDateByDayLabel(strDate, i)};
    }
  }
  else if (fromToParts.length > 2) {
    let toDate = fromToParts[2];
    let toDateParts = toDate.split('/');
    console.log('extractDates toDateParts', toDateParts);
    if (toDateParts.length > 1) {
      let year = getYear(toDateParts[1]);
      let weekLength = DAYS.length;
      for (var i = weekLength; i > 0; i--) {
        let strDate = year + '/' + toDateParts[1] + '/' + toDateParts[0];
        result = {...result, ...getDateByDayLabel(strDate, -i)};
      }
    }
    else if (fromToParts.length > 3) {
      let monthLabel = fromToParts[3];
      let month = MONTHS.indexOf(monthLabel) + 1;
      console.log('extractDates monthLabel', monthLabel, month);
      if (month) {
        let year = getYear(month);
        let weekLength = DAYS.length;
        for (var i = weekLength; i > 0; i--) {
          let strDate = year + '/' + month + '/' + toDateParts[0];
          result = {...result, ...getDateByDayLabel(strDate, -i)};
        }
      }
    }
  }
  console.log('extractDates', result);
  return result;
}

function getYear(month) {
  console.log('getYear', month);
  let year = new Date().getFullYear();
  // (new Date().getMonth()) and not (new Date().getMonth() + 1) to keep 1 month of previous periods
  let now = new Date();
  if (month < now.getMonth()) {
    year = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).getFullYear();
  }
  console.log('getYear', year);
  return year;
}

function getDateByDayLabel(strDate, diff) {
  console.log('getDateByDayLabel', strDate);
  let date = new Date(strDate);
  date = new Date(date.getTime() + diff * 24 * 60 * 60 * 1000);
  let dayLabel = DAYS[date.getDay()];
  let result = {};
  let month = date.getMonth() + 1;
  if (month < 10) {
    month = '0' + month;
  }
  let day = date.getDate();
  if (day < 10) {
    day = '0' + day;
  }
  result[dayLabel] = date.getFullYear() + '/' + month + '/' + day;
  console.log('getDateByDayLabel', result);
  return result;
}

function doOnReservations(json) {
  console.log('doOnReservations', json);
  $('#reservationsZone').html('');
  let reservationBySelector = {};
  let pendingReservations = {};
  $(Object.keys(json)).each(function(cpt, element) {
    let reservation = json[element];
    if (element == 'pending') {
      pendingReservations = reservation;
      return doOnPendingReservations(pendingReservations);
    }
    reservation.id = element;
    let status = reservation.Statut[0].toLowerCase();
    if (status == 'confirmée') {
      reservationByID[element] = reservation;
      let selector = '.day' + getHtmlID(reservation.date) + '_' +
        reservation.hours.replace(/\s+[à|>]\s+/g, '_') +
        ' .slot.' + getHtmlID(reservation.activity);
      console.log('doOnReservations', selector, reservation, $(selector).length);
      let slot = $(selector);
      if (slot.length) {
        let name = reservation['Personne concernée'][0].replace(/ /g, '.').toLowerCase();
        if (!reservationBySelector[selector]) {
          reservationBySelector[selector] = {};
        }
        reservationBySelector[selector][name] = reservation;
        if (slot.is('.' + name)) {
          let iBookForFirstName = localStorage.getItem('iBookForFirstName') || profil.firstName;
          let iBookForLastName = localStorage.getItem('iBookForLastName') || profil.lastName;
          let planningFor = getHtmlID(iBookForFirstName + ' ' + iBookForLastName);
          slot.addClass('confirmed').removeClass('pending').attr('confirmedSlot', element).attr('for', planningFor);
        }
      }
    }
  });
  let keys = Object.keys(reservationBySelector);
  if (keys.length) {
    let html = '<table><tbody>';
    $(keys).sort().each(function(cpt, element) {
      let reservationByName = reservationBySelector[element];
      $(Object.keys(reservationByName)).each(function(cpt, element) {
        let reservation = reservationByName[element];
        console.log('doOnReservations for reservations', reservation);  
        let date = new Date(reservation.date);
        let planningFor = getHtmlID(reservation['Personne concernée'][0]);
        html += '<tr class="slot confirmed ' + (cpt % 2 == 0 ? 'even' : 'odd') + '" confirmedSlot="' + reservation.id + '" for="' + planningFor + '">';
        html += '<td style="width:1%"><img src="' + getURL('images/remove.png') + '" class="cancel" /></td>';
        html += '<td style="width:1%">' + reservation.day + '</td>';
        html += '<td style="width:1%">' + date.getDate() + '/' + (date.getMonth() + 1) + ' ' + reservation.hours.split(' à ')[0] + '</td>';
        html += '<td>' + reservation.activity + '</td>';
        html += '<td style="width:1%">' + reservation['Personne concernée'][0] + '</td>';
        html += '<td style="width:1%">' + reservation.duration.replace(' minutes', 'mns') + '</td>';
        html += '</tr>';  
      });
    });
    html += '</tbody></table>';
    $('#reservationsZone').append(html);
    $('#reservationsZone img.cancel').click(removeReservation);
  }
  if ($('#accordion').accordion('option', 'active') !== 0) {
    if (keys.length || Object.keys(pendingReservations).length) {
      $('#accordion').accordion('option', 'active', 0);
    }
    else {
      $('#accordion').accordion('option', 'active', false);
    }
  }
}

function doOnPendingReservations(reservations) {
  console.log('doOnPendingReservations', reservations);
  let keys = Object.keys(reservations);
  $(keys).each(function(cpt, element) {
    let reservation = reservations[element];
    let selector = '.day' + ((reservation.date || 'notfound').replace(/\//g, '_') + '_' +
      reservation[3][0].replace(/\s+[à|>]\s+/g, '_')) +
      ' .slot.' + (reservation[0][0].replace(/ /g, '_') +
      '.' + reservation[2][0].replace('Réservation pour ', '').replace(/ /g, '.')).toLowerCase();
    let iBookForFirstName = localStorage.getItem('iBookForFirstName') || profil.firstName;
    let iBookForLastName = localStorage.getItem('iBookForLastName') || profil.lastName;
    let planningFor = getHtmlID(iBookForFirstName + ' ' + iBookForLastName);
    console.log('doOnPendingReservations', selector, reservation, planningFor);
    $(selector).addClass('pending').removeClass('confirmed').attr('pendingSlot', element).attr('for', planningFor);
  });
  let lenght = keys.length;
  if (lenght) {
    if (lenght == 1) {
      $('#validate .multiple').hide();
      $('#validate .single:hidden').show();
    }
    else {
      $('#validate .single').hide();
      $('#validate .multiple').show();
    }
    $('#validate:hidden').slideToggle('fast');
    let html = '<table><tbody>';
    $(keys).sort().each(function(cpt, element) {
      let reservation = reservations[element];
      console.log('doOnPendingReservations for reservation', reservation);
      let planningFor = getHtmlID(reservation[2][0].replace('Réservation pour ', ''));
      html += '<tr class="slot pending ' + (cpt % 2 == 0 ? 'even' : 'odd') + '" pendingSlot="' + element + '" for="' + planningFor + '">';
      html += '<td style="width:1%"><img src="' + getURL('images/remove.png') + '" class="cancel" /></td>';
      html += '<td style="width:1%">' + reservation.day + '</td>';
      if (reservation.date) {
        let date = new Date(reservation.date);
        html += '<td style="width:1%">' + date.getDate() + '/' + (date.getMonth() + 1) + ' ' + reservation[3][0].split('>')[0].trim() + '</td>';  
      }
      html += '<td>' + reservation[0] + '</td>';
      html += '<td class="reservationFor" style="width:1%">' + reservation[2][0].replace('Réservation pour ', '') + '</td>';
      html += '<td style="width:1%">' + reservation[4][0].replace(' min', 'mns') + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table>';
    $('#reservationsZone').html(html);
    if ($('#accordion').accordion('option', 'active') !== 0) {
      $('#accordion').accordion('option', 'active', 0);
    }
    $('.reservationFor').click(doOnReservationForCkick);
  }
}

function doOnReservationForCkick(event) {
  console.log('doOnReservationForCkick', event);
  $('#iBookForFirstName').val($(event.target).text()).change();
}

async function addReservation(event) {
  console.log('addReservation', event.target);
  let target = $(event.target);
  let slot = target.attr('slot');
  let activity = target.attr('activity');
  let period = target.attr('period');
  await setCenter();
  fetchUrl(URL_MI_ACTIVITY + activity + '&periode=' + period)
    .then(function() {activity, 
      fetchUrl(URL_MI_SLOTS_ADD + '?action=reserver&liste_attente=0&creneau=' + slot +
        '&prenom=' + encodeURIComponent($('#iBookForFirstName').val()) + '&nom=' + encodeURIComponent($('#iBookForLastName').val()))
        .then(fetchReservations);
    });
}

function removeReservation(event) {
  console.log('removeReservation', event.target);
  let slot = $(event.target).closest('.slot');
  let pendingSlot = slot.attr('pendingSlot');
  let confirmedSlot = slot.attr('confirmedSlot');
  if (pendingSlot) {
    removePendingSlot(pendingSlot);
  }
  else if (confirmedSlot) {
    removeConfirmedSlot(confirmedSlot);
  }
}

function removePendingSlot(pendingSlot) {
  if (pendingSlot.target) {
    pendingSlot = $(pendingSlot.target).attr('pendingSlot');
  }
  console.log('removePendingSlot', pendingSlot);
  $('.slot[pendingSlot=' + pendingSlot + ']').removeClass('pending').removeAttr('pendingSlot');
  fetchUrl(URL_MI_RESERVATIONS_REMOVE + pendingSlot)
    .then(fetchReservations);
  if ($('.slot.pending').length == 0) {
    $('#validate:visible').slideToggle('fast');
  }
}

function removeConfirmedSlot(confirmedSlot) {
  if (confirmedSlot.target) {
    confirmedSlot = $(confirmedSlot.target).closest('.slot').attr('confirmedSlot');
  }
  console.log('removeConfirmedSlot', confirmedSlot);
  let slot = reservationByID[confirmedSlot];
  let html = '<div id="confirmation" title="confirmation">';
  html += 'Confirmez-vous vouloir annuler votre séance<br/>';
  html += slot['Activité'][0].replace('(' + slot.duration + ')', '').split(' de ').join('<br/>de ').trim();
  html += '<br/>pour ' + slot['Personne concernée'][0]
  html += ' ? ';
  html += '</div>';
  let buttons = {
    'Non': function() {
      $(this).remove();
    },
    'Oui': function() {
      $(this).remove();
      $('.slot[confirmedSlot=' + confirmedSlot + ']').removeClass('confirmed').removeAttr('confirmedSlot').removeAttr('for');
      fetchUrl(URL_MI_RESERVATIONS_CANCEL + confirmedSlot)
        .then(fetchReservations);
    }
  };
  dialog('confirmation', html, {buttons: buttons});
}

function doOnValidate() {
  console.log('doOnValidate');
  $('#validate:visible').slideToggle('fast');
  fetchUrl(URL_MI_INFOS)
    .then(() => {
      $('.slot.pending').removeAttr('pendingSlot');
    })
    .then(fetchReservations);
}

function getJsonResponse(response) {
  return response.json(); 
}

function dialog(id, html, options) {
  $(window).scrollTop(0);
  $('#' + id).remove();
  let dialogOptions = {...{
    width: 'auto',
    position: {
      at: 'center top+50',
      my: 'center top'
    }
  }, ...options};
  $(html).dialog(dialogOptions);
}

function explodeTrim(value) {
  let text = value.text ? value.text() : value;
  return text.trim().replace(/\s*\n\s*/g, '\n').split('\n');
}

async function fetchUrl(path) {
  let url = document.location.origin + path;
  console.log('fetchUrl', url);
  return fetch(url);
}

function getHtmlID(value) {
  return value.replace(/[\s>\/]/g, '_').replace(/_+/g, '_').toLowerCase();
}

function doOnError(msg, url, line, col, error) {
  console.log(msg, url, line, col, error);
  let urlParts = (url).split('/');
  let file = urlParts[urlParts.length - 1] || url;
  dialog('mcano_content', '<div id="mcano_content" title="ooops..." style="text-align:center">\
    <br/>\
    une erreur non prévue vient de se produire<br />\
    mais pas de panique !<br />\
    <br/>\
    on peut commencer à la résoudre en actualisant la page<br />\
    <button id="btnRefresh">actualiser la page</button><br />\
    <br/>\
    si le problème persiste on peut supprimer le cache<br />\
    <button id="btnClearCache">supprimer le cache</button><br />\
    <br/>\
    sinon il faudra contacter le developpeur (<a href="mailto:eric.blanquer@gmail.com">moi</a>) avec ce message :<br />\
    <fieldset style="border-radius:5px;margin-top:30px">\
      <legend>' + msg + '</legend>\
      ' + file + '(' + line + ':' + col + ')<br />' + error + '\
    </fieldset>\
  </div>');
  $('#btnRefresh').button().click(function() {
    document.location.reload();
  });
  $('#btnClearCache').button().click(function() {
    localStorage.clear();
    document.location.reload();
  });
}