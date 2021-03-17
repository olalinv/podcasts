'use strict';

const DEBUG_MODE = false;

const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/';
const DEFAULT_LOCALE = 'es-ES';
const LAST_PODCASTS = 'lastPodcasts';
const LAST_REQUEST_DATE = 'lastRequestDate';
const NOW = Date.now();
const ONE_DAY = 1000 * 60 * 60 * 24;
const PODCAST_URL = CORS_PROXY + 'https://itunes.apple.com/lookup?id=';
const PODCASTS_URL = CORS_PROXY + 'https://itunes.apple.com/us/rss/toppodcasts/limit=100/genre=1310/json';
const PRELOADER = '[data-property="preloader"]';
const VIEW_DETAIL = '[data-view="detail"]';
const VIEW_MAIN = '[data-view="main"]';

// Debug logs
if (typeof (console) === 'undefined') {
  console = {};
}
if (!DEBUG_MODE || typeof (console.log) === 'undefined') {
  console.log = console.error = console.info = console.debug = console.warn = console.trace = console.dir = console.dirxml = console.group = console.groupEnd = console.time = console.timeEnd = console.assert = console.profile = function () { };
}


// Events
window.onpopstate = function (event) {
  if (event.state) {
    console.log(event.state);
    switch (event.state.name) {
      case 'podcasts-list':
        loadView('/app/views/podcasts-list.html', VIEW_MAIN, getPodcasts);
        break;
      case 'podcast-detail':
        loadView('/app/views/podcast-detail.html', VIEW_MAIN, () => loadPodcastDetail(event.state.podcastId));
        break;
      case 'episode-detail':
        loadView('/app/views/episode-detail.html', VIEW_DETAIL, () => getEpisode(event.state.episodeTitle, event.state.episodeDescription, event.state.episodeUrl));
        break;
    }
  }
}

// onDOMReady
document.addEventListener('DOMContentLoaded', function (event) {
  let data = {
    name: 'podcasts-list'
  };
  history.replaceState(data, document.title, document.location.href);
  init();
}, false);

// onKeyUp
document.addEventListener('keyup', function (event) {
  if (event.target && event.target.matches('#filterPodcasts')) {
    let podcasts = document.querySelectorAll('.podcast-item');
    podcasts.forEach(function (podcast) {
      podcast.parentNode.removeChild(podcast);
    });
    // podcasts.innerHTML('');
    let q = event.target.value;
    filterPodcasts(q);
  }
});

// onClick
document.addEventListener('click', function (event) {
  event.preventDefault();
  // Podcasts list
  let podcastsListItem = event.target.closest('[data-router="podcasts-list"]');
  if (event.target && podcastsListItem) {
    let data = {
      name: 'podcasts-list'
    };
    let title = 'Podcasts list';
    let url = '/';
    history.pushState(data, title, url);
    loadView('/app/views/podcasts-list.html', VIEW_MAIN, getPodcasts);
  }
  // Podcast detail
  let podcastItem = event.target.closest('[data-router="podcast-detail"]');
  if (event.target && podcastItem) {
    let podcastId = podcastItem.dataset.podcastId;
    let data = {
      name: 'podcast-detail',
      podcastId: podcastId
    };
    let title = 'Podcast detail';
    let url = `/podcast/${podcastId}`;
    history.pushState(data, title, url);
    loadView('/app/views/podcast-detail.html', VIEW_MAIN, () => loadPodcastDetail(podcastId));
  }
  // Episode detail
  let episodeItem = event.target.closest('[data-router="episode-detail"]');
  if (event.target && episodeItem) {
    let podcastId = episodeItem.dataset.podcastId;
    let episodeId = episodeItem.dataset.episodeId;
    let episodeTitle = episodeItem.dataset.episodeTitle;
    let episodeDescription = episodeItem.dataset.episodeDescription;
    let episodeUrl = episodeItem.getAttribute('href');
    let data = {
      name: 'episode-detail',
      episodeTitle: episodeTitle,
      episodeDescription: episodeDescription,
      episodeUrl: episodeUrl
    };
    let title = 'Episode detail';
    let url = `/podcast/${podcastId}/episode/${episodeId}`;
    history.pushState(data, title, url);
    loadView('/app/views/episode-detail.html', VIEW_DETAIL, () => getEpisode(episodeTitle, episodeDescription, episodeUrl));
  }
});

// Functions

function init() {
  loadView('/app/views/podcasts-list.html', VIEW_MAIN, getPodcasts);
}

function getPodcasts() {
  let podcasts;
  let lastRequestDate = localStorage.getItem(LAST_REQUEST_DATE);
  // Get the list of the 100 most popular podcasts (from local storage or internet)
  if (lastRequestDate && !isOneDayOld(lastRequestDate)) {
    podcasts = JSON.parse(localStorage.getItem(LAST_PODCASTS));
    console.log(podcasts);
    podcasts.feed.entry.forEach(function (podcast) {
      addPodcast(podcast);
    });
    updateCounter(podcasts.feed.entry.length);
  } else {
    podcasts = fetch(PODCASTS_URL);
    podcasts.then((response) => response.json()).then((json) => {
      // Get the list of the 100 most popular podcasts
      console.log(json);
      json.feed.entry.forEach(function (podcast) {
        addPodcast(podcast);
      });
      // Save in browser 
      localStorage.setItem(LAST_REQUEST_DATE, NOW);
      localStorage.setItem(LAST_PODCASTS, JSON.stringify(json));
      // Update counter
      updateCounter(json.feed.entry.length);
    }).catch(err => console.error(err));
  }
  hide(PRELOADER);
}

function addPodcast(podcast) {
  let id = podcast.id.attributes['im:id'];
  let image = podcast['im:image'][2].label;
  let name = podcast['im:name'].label;
  let author = podcast['im:artist'].label;
  let podcasts = document.querySelector('#podcasts');
  let podcastTemplate = document.querySelector('#podcastTemplate');
  let podcastItem = podcastTemplate.content.querySelector('.podcast-item');
  podcastItem.setAttribute('href', '/podcast/' + id);
  podcastItem.dataset.podcastId = id;
  let podcastImage = podcastTemplate.content.querySelector('.podcast-image');
  podcastImage.setAttribute('src', image);
  let podcastName = podcastTemplate.content.querySelector('.podcast-name');
  podcastName.textContent = name;
  let podcastAuthor = podcastTemplate.content.querySelector('.podcast-author');
  podcastAuthor.textContent = author;
  let clone = document.importNode(podcastTemplate.content, true);
  podcasts.appendChild(clone);
}

function filterPodcasts(q) {
  let count = 0;
  q = q.toLowerCase();
  let podcasts = JSON.parse(localStorage.getItem(LAST_PODCASTS));
  podcasts.feed.entry.forEach(function (podcast) {
    let name = podcast['im:name'].label.toLowerCase();
    let artist = podcast['im:artist'].label.toLowerCase();
    if (name.includes(q) || artist.includes(q)) {
      addPodcast(podcast);
      count++;
    }
  });
  updateCounter(count);
}

function updateCounter(count) {
  let counter = document.querySelector('#counter');
  counter.textContent = count;
}

function loadPodcastDetail(id) {
  let lastRequestDate = localStorage.getItem('lastRequestDatePodcast' + id);
  let json, image, name, author, trackId, trackCount, feedUrl;
  if (lastRequestDate && !isOneDayOld(lastRequestDate)) {
    json = JSON.parse(localStorage.getItem('podcast' + id));
    image = json.results[0].artworkUrl100;
    name = json.results[0].collectionName;
    author = json.results[0].artistName;
    trackId = json.results[0].trackId;
    trackCount = json.results[0].trackCount;
    feedUrl = json.results[0].feedUrl;
    getPodcast(image, name, author, trackId, trackCount, feedUrl);
  } else {
    let podcast = fetch(PODCAST_URL + id);
    podcast.then((response) => response.json()).then((json) => {
      console.log(json);
      if (json.resultCount) {
        image = json.results[0].artworkUrl100;
        name = json.results[0].collectionName;
        author = json.results[0].artistName;
        trackId = json.results[0].trackId;
        trackCount = json.results[0].trackCount;
        feedUrl = json.results[0].feedUrl;
        getPodcast(image, name, author, trackId, trackCount, feedUrl);
        // Save in browser 
        localStorage.setItem('lastRequestDatePodcast' + id, NOW);
        localStorage.setItem('podcast' + id, JSON.stringify(json));
      }
    }).catch(err => console.error(err));
  }
}

function getPodcast(image, name, author, trackId, trackCount, feedUrl) {
  let podcastTracklist = fetch(CORS_PROXY + feedUrl);
  podcastTracklist.then((response) => response.text()).then((xml) => {
    xml = new DOMParser().parseFromString(xml, 'text/xml');
    console.log(xml);
    let description = xml.querySelector('description').textContent;
    document.querySelector('.podcast-info').dataset.podcastId = trackId;
    document.querySelector('.podcast-info').setAttribute('href', `/podcast/${trackId}`);
    document.querySelector('.podcast-image').setAttribute('src', image);
    document.querySelector('.podcast-name').textContent = name;
    document.querySelector('.podcast-author .field-value').textContent = author;
    document.querySelector('.podcast-description .field-value').innerHTML = description;
    document.querySelector('.episodes-count .field-value').textContent = trackCount;
    let episodes = xml.querySelectorAll('item');
    let tbody = document.querySelector('#episodesList table tbody');
    episodes.forEach(function (episode) {
      let id = episode.querySelector('guid').textContent;
      let url = episode.querySelector('enclosure').getAttribute('url');
      let title = episode.querySelector('title').textContent;
      let description = '';
      if (episode.querySelector('description')) {
        description = episode.querySelector('description').textContent;
      }
      let date = episode.querySelector('pubDate').textContent;
      date = formatDateToLocale(date, DEFAULT_LOCALE);
      let duration = episode.getElementsByTagNameNS('http://www.itunes.com/dtds/podcast-1.0.dtd', 'duration')[0].textContent;
      if (!duration.includes(':')) {
        duration = secondsToTimeString(duration);
      }
      let episodeTemplate = document.querySelector('#episodeTemplate');
      let td = episodeTemplate.content.querySelectorAll('td');
      td[0].querySelector('.episode-link').textContent = title;
      td[0].querySelector('.episode-link').dataset.podcastId = trackId;
      td[0].querySelector('.episode-link').dataset.episodeId = id;
      td[0].querySelector('.episode-link').dataset.episodeTitle = title;
      td[0].querySelector('.episode-link').dataset.episodeDescription = description;
      td[0].querySelector('.episode-link').setAttribute('href', url);
      td[1].textContent = date;
      td[2].textContent = duration;
      let clone = document.importNode(episodeTemplate.content, true);
      tbody.appendChild(clone);
    });
    hide(PRELOADER);
  }).catch(err => console.error(err));
}

function getEpisode(title, description, url) {
  document.querySelector('.episode-title').textContent = title;
  document.querySelector('.episode-description').innerHTML = description;
  document.querySelector('#episodePlayer').setAttribute('src', url);
  document.querySelector('#episodePlayer').load();
  hide(PRELOADER);
}

function loadView(template, section, callback) {
  show(PRELOADER);
  let view = fetch(template);
  view.then((response) => response.text()).then((html) => {
    let parser = new DOMParser();
    let template = parser.parseFromString(html, 'text/html');
    let newHtml = template.querySelector(section).outerHTML;
    document.querySelector(section).outerHTML = newHtml;
    callback();
    // hide(PRELOADER);
  }).catch(err => console.error(err));
}

function isOneDayOld(date) {
  let dateTimeStamp = new Date(Number(date)).getTime();
  if (dateTimeStamp) {
    // Compare timestamps
    let timePassed = (NOW - dateTimeStamp);
    return timePassed > ONE_DAY;
  }
}

function secondsToTimeString(seconds) {
  return Math.floor(seconds / 60) + ':' + (seconds % 60 ? seconds % 60 : '00');
}

function formatDateToLocale(date, locale) {
  return new Intl.DateTimeFormat(locale).format(new Date(date));
}

function hide(element) {
  document.querySelector(element).hidden = true;
}

function show(element) {
  document.querySelector(element).hidden = false;
}