const remote = require('electron').remote
const app = remote.app

let patient_ID = ''
const task_name = 'provocation'
const dateObj = new Date()
const date_today = dateObj.toDateString().split(' ').join('-')
const date_timestamp = [dateObj.getHours(), dateObj.getMinutes(), dateObj.getSeconds()].join('-')
let filename = ''
let path_to_save = ''
const path_to_alldata = app.getPath('home')+'/OCD-Project-Data/'

const RUN_AS_DEBUG = false
const fs = require('fs')
const timings = {
  'fixation': {
    'timing': (RUN_AS_DEBUG) ? [.1,.1,.1] : [2, 20, 2],
    'rating': [false, true, false]
  },
  'provocation': {
    'timing': (RUN_AS_DEBUG) ? [.1,.1,.1] : [30, 20, 10],
    'rating': [false, true, false]
  },
  'neutral': {
    'timing': (RUN_AS_DEBUG) ?  [.1,.1] : [10, 20],
    'rating': [false, true]
  }
}
const path_to_images = 'static/images/'
const images = [
  { // ocd_infoblob
    type: 'checking',
    prettyType: 'Checking',
    desc: ['fire', 'burglary'],
    image_names: ['stove.png', 'lock-and-key.png', 'light-switch.png', 'power-outlet.png']
  },{
    type: 'intrusive_thoughts',
    prettyType: 'Intrusive Thoughts',
    desc: ['death', 'jail'],
    image_names: ['knife.png', 'jail.png', 'accident-sign.png', 'car-crash.png']
  },{
    type: 'contaimination',
    prettyType: 'Contamination',
    desc: ['HIV', 'food poisoning'],
    image_names: ['bandaids.png', 'poison.png', 'ecoli-outbreak.png', 'breathing-mask.png']
  },{
    type: 'scrupulosity',
    prettyType: 'Scrupulosity',
    desc: ['blasphemy', 'moral sin'],
    image_names: ['bible.png', 'star-of-david.png', 'satanic-circle.png', 'koran.png']
  },{
    type: 'perfectionism',
    prettyType: 'Perfectionism / Just Right',
    desc: ['sloppy', 'unprepared'],
    image_names: ['bad-handwriting.png', 'messy-office.png', 'book-report-fail.png', 'jobless.png']
  },{
    type: 'post_partum_OCD',
    prettyType: 'Post-partum OCD',
    desc: ['hurting baby', 'not loving baby'],
    image_names: ['baby-bath.png', 'scissors.png', 'baby-crosswalk.png', 'baby-crib.png']
  }
]

const neutral_images = ['blue-sky.png', 'sky-birds.png', 'flowers.png', 'beach.png']

let ocdType_primary; //ocd_infoblob
let ocdType_secondary;

let enter_patient_info = {
  timeline: [
    {
      type: 'survey-text',
      questions: [{ prompt: '<span id="patient-id-please">Please enter patient ID.</span>'}],
      on_finish: function(data) {
        const answer = JSON.parse(data.responses)['Q0']
        patient_ID = (answer === '') ? 'TEST_ID' : answer
        jsPsych.data.addProperties({
          'patient_ID': patient_ID
        })
      }
    },{
      type: 'survey-multi-choice',
      preamble: '<h2>OCD Category Assignment</h2>',
      questions: [{
        prompt: 'Please select <b style="color:red;">primary</b> OCD category.',
        options: images.map(ocd_obj => ocd_obj.prettyType),
        required: true
      }],
      on_finish: function(data) {
        let pretty_answer_primary = JSON.parse(data.responses)['Q0']

        let answer_primary = images.find(ocd_obj => (ocd_obj.prettyType === pretty_answer_primary)) //ocd_infoblob

        jsPsych.data.addProperties({
          'ocd_primary': answer_primary
        })

        ocdType_primary = answer_primary //ocd_infoblob
        ocdType_primary.image_names = jsPsych.randomization.shuffle(ocdType_primary.image_names)
      }
    },{
      type: 'survey-multi-choice',
      preamble: '<h2>OCD Category Assignment</h2>',
      questions: [],
      on_start: function(trial) {
        let opts = (images.map(ocd_obj => ocd_obj.prettyType).filter(prettyType => prettyType !== ocdType_primary.prettyType))
        opts.push('Do not choose secondary category.')
        trial.questions = [{
          prompt: 'Please select <b style="color:red;">secondary</b> OCD category.',
          options: opts,
          required: true
        }]
      },
      on_finish: function(data) {
        let pretty_answer_secondary = JSON.parse(data.responses)['Q0']

        let answer_secondary;
        if (pretty_answer_secondary === 'Do not choose a secondary category.') {
          answer_secondary = null
        }
        else {
          answer_secondary = images.find(ocd_obj => (ocd_obj.prettyType === pretty_answer_secondary))
        }

        jsPsych.data.addProperties({
          'ocd_secondary': answer_secondary
        })
        ocdType_secondary = answer_secondary

        if (ocdType_secondary) {
          ocdType_secondary.image_names = jsPsych.randomization.shuffle(ocdType_secondary.image_names)
        }
      }
    }
  ]
}

const MAX_PROVOKE = 10
const MIN_PROVOKE = 0
let provokometer = 0
let rating_submit_time = 0
let provokometer_timestamps = []
let provokometer_ratings = []

function handleRatingDelta(delta, callback) {
  if (provokometer > MIN_PROVOKE && provokometer < MAX_PROVOKE) {
    (delta > 0) ? provokometer += 1 : provokometer -= 1
  }
  else if (provokometer === MIN_PROVOKE) {
    (delta > 0) ? provokometer += 1 : provokometer
  }
  else if (provokometer === MAX_PROVOKE) {
    (delta > 0) ? provokometer : provokometer -= 1
  }

  callback()
}

function updateProvokometer() {
  provokometer_ratings.push(provokometer)
  provokometer_timestamps.push(Date.now())

  document.getElementById("provocation-slider").innerHTML = provokometer
}

function wheelHandle(event) {
  const delta = Math.sign(event.wheelDelta)
  handleRatingDelta(delta, updateProvokometer)
}
function keydownHandle(event) {
  const key = event.key
  console.log(event)
  if (key === ' ' || key === '2') {
    rating_submit_time = Date.now()
    removeRatingListener()
    
    document.getElementById("provocation-slider").innerHTML = '　'
  }
  else if (key === 'ArrowRight' || key === '3') {
    handleRatingDelta(1, updateProvokometer)
  }
  else if (key === 'ArrowLeft' || key === '1') {
    handleRatingDelta(-1, updateProvokometer)
  }
}

function removeRatingListener() {
  window.removeEventListener("wheel", wheelHandle, false)
  window.removeEventListener("keydown", keydownHandle)
}
function addRatingListener() {
  provokometer = 0
  provokometer_timestamps = []
  provokometer_ratings = []

  document.getElementById("provocation-slider").innerHTML = provokometer

  window.addEventListener("keydown", keydownHandle)
  window.addEventListener("wheel", wheelHandle, false)
}

function generateTimeline(times, ratings, stimulus, image_name, cycle_stage) {
  if (times.length !== ratings.length) {
    console.log('ERROR: times.length does not equal ratings.length') // TODO: make this an actual error
  }
  let timeline = []
  for (let i=0; i<times.length; i++) {
    let part = {
      'stimulus': '<div id="stimulus-container">'+stimulus+'<div id="provocation-slider">　</div></div>',
      'trial_duration': times[i] * 1000,
      'record_rating': ratings[i],
      'image_name': image_name,
      'cycle_stage': cycle_stage
    }
    timeline.push(part)
  }
  return timeline
}

function generateFixation() {
  let fixation = generateTimeline(
    timings.fixation.timing, 
    timings.fixation.rating, 
    '<div id="fixation-container"><div id="fixation-dot"></div></div>',
    null,
    'fixation')

  return fixation
}

function generateProvocation(image_name) {
  let provocation = generateTimeline(
    timings.provocation.timing, 
    timings.provocation.rating, 
    '<img src="' + path_to_images+image_name + '"class="provocation-image">',
    image_name,
    'provocation')

  return provocation
}

function generateNeutral(image_name) {
  let neutral = generateTimeline(
    timings.neutral.timing, 
    timings.neutral.rating, 
    '<img src="' + path_to_images+image_name + '"class="neutral-image">',
    image_name,
    'neutral')

  return neutral
}

function constructBlock(ocd_infoblob, block_num, max_blocks) {
  let timeline = []
  timeline.push({
    'block_transition': true,
    'choices': jsPsych.ALL_KEYS,
    'stimulus': '<h1>Block '+block_num+' of '+max_blocks+' will begin.<h1><h2>When you are ready, press button to continue.</h2>',
    'trial_duration': null,
    'record_rating': false,
    'cycle_stage': 'block transition'
  })
  for (let i=0; i<ocd_infoblob.image_names.length; i++) {
    timeline.push(generateFixation())
    timeline.push(generateProvocation(ocd_infoblob.image_names[i]))
    timeline.push(generateFixation())
    let random_neutral_image = neutral_images[Math.floor(Math.random() * neutral_images.length)]
    timeline.push(generateNeutral(random_neutral_image))
  }
  timeline.push({
    'block_transition': true,
    'choices': jsPsych.ALL_KEYS,
    'stimulus': '<h1>Block '+block_num+' of '+max_blocks+' has ended.<h1><h2>Take a short break now.  Press button to continue.</h2>',
    'trial_duration': null,
    'record_rating': false,
    'cycle_stage': 'block transition'
  })

  return timeline
}

let config_timeline = []

let screen = {
  'type': 'html-keyboard-response',
  'stimulus': 'no stimulus',
  'choices': jsPsych.NO_KEYS,
  'on_start': function(trial) {
    let trial_config = config_timeline.shift()

    if (trial_config.block_transition) { trial.choices = jsPsych.ALL_KEYS }

    trial.stimulus = trial_config.stimulus
    trial.trial_duration = trial_config.trial_duration

    let on_off = (trial_config.cycle_stage === 'fixation' || trial_config.block_transition) ? 'unlit' : 'lit'
    trial.prompt =
      "<div class='photodiode-box' id='photodiode-box'>" +
        "<span class='photodiode-spot " + on_off + "' id='photodiode-spot'></span>" +
      "</div>"

    if (RUN_AS_DEBUG) {
      trial.prompt += 
        "<div class='debug-text'>" + trial_config.cycle_stage + "</div>" +
        "<div class='debug-text'>record rating: " + trial_config.record_rating + "</div>" +
        "<div class='debug-text'>trial duration: " + trial_config.trial_duration + "</div>"
    }

    if (trial_config.record_rating) {
      trial.on_load = function() { 
        document.getElementsByClassName('jspsych-content-wrapper')[0].style.cursor = 'none'
        // flash_PD_spot()
        addRatingListener()
      }
      trial.on_finish = function(data) {
        let cleanData = {}

        cleanData.rating_final = provokometer
        cleanData.rating_final_timestamp = (rating_submit_time === 0) ? Date.now() : rating_submit_time
        cleanData.rating_ratings = provokometer_ratings
        cleanData.rating_timestamps = provokometer_timestamps

        cleanData.time_elapsed = data.time_elapsed

        cleanData.image_name = trial_config.image_name
        cleanData.cycle_stage = trial_config.cycle_stage

        fs.readFile(path_to_save+filename, 'utf-8', function(err, fs_data) {
          if (err) throw err;
          let newStream = fs_data.slice(0, -1)
          newStream += ','
          newStream += JSON.stringify(cleanData) + ']'
          fs.writeFile(path_to_save+filename, newStream, (err) => {
            if (err) throw err;
            console.log('Data saved to ' + filename)
          })
        })

        removeRatingListener() 
      }
    }
  }
}

const run_experiment = {
  'timeline': [screen],
  'loop_function': function() {
    return config_timeline.length > 0
  }
}

function flash_PD_spot() {
  let spot = document.getElementById("photodiode-spot")
  spot.style.visibility = "visible"
  setTimeout(function() {
    spot.style.visibility = "hidden"
  }, 100)
}

function saveToFile(data, path_to_file) {
  fs.writeFile(path_to_file, data, (err) => {
    if (err) throw err;
    console.log('Data saved to ' + path_to_file)
  })
}

var patient_handover = {
  'type': 'html-keyboard-response',
  'stimulus': '<h2>Task may begin.</h2><h3>Please present screen to patient</h3><h3>Press any key to begin task.</h3>',
  'prompt': "<div class='photodiode-box' id='photodiode-box'>" +
      "<span class='photodiode-spot unlit' id='photodiode-spot'></span>" +
    "</div>",
  'on_finish': function(data) {
    let max_blocks = (ocdType_secondary) ? 4 : 2

    config_timeline.push(constructBlock(ocdType_primary, 1, max_blocks)) // Block 1
    config_timeline.push(constructBlock(ocdType_primary, 2, max_blocks)) // Block 2 (1)
    if (ocdType_secondary) {
      config_timeline.push(constructBlock(ocdType_secondary, 3, max_blocks)) // Block 3
      config_timeline.push(constructBlock(ocdType_secondary, 4, max_blocks)) // Block 4 (3)
    }

    function flattenDeep(arr1) {
      return arr1.reduce((acc, val) => Array.isArray(val) ? acc.concat(flattenDeep(val)) : acc.concat(val), []);
    }
    config_timeline = flattenDeep(config_timeline)

    // console.log(config_timeline.map(elem => elem.image_name))

    jsPsych.data.addProperties({
      'experiment_start': Date.now()
    })

    // ************ SAVE TO FILE ***************
    const path_array = [path_to_alldata.slice(0,-1), patient_ID, task_name, date_today]
    path_to_save = path_array.join('/')+'/'
    filename = [patient_ID, task_name, date_today, date_timestamp].join('_') + '.JSON'

    function initializePath(path, callback) {
      if (path.length === 0) { throw new Error('Ran out of path!')}
      else {
        const tryFolder = path.pop()+'/'
        const tryPath = path.join('/')+'/'

        if (fs.existsSync(tryPath)) {
          fs.mkdir(tryPath+tryFolder, callback)
        }
        else {
          initializePath(path, function() {
            fs.mkdir(tryPath+tryFolder, callback)
          })
        }
      }
    }

    const init_data = {
      'filename': filename,
      'experiment_starttime': data.experiment_start,
      'patient_ID': data.patient_ID,
      'ocd_primary': data.ocd_primary,
      'ocd_secondary': data.ocd_secondary
    }

    const newStream = '[' + JSON.stringify(init_data) + ']'

    initializePath(path_array, function() {
      saveToFile(newStream, path_to_save+filename)
    })
  }
}

var new_experiment_screen = {
  'type': 'html-keyboard-response',
  'stimulus': '<h1>New Computer Provocation Task</h1><h3>Please enter pre-task information on the next screens.</h3>',
  'prompt': '<p style="color:white;">Press "Alt+F" to toggle fullscreen.</p>' + 
    "<div class='photodiode-box' id='photodiode-box'>" +
      "<span class='photodiode-spot unlit' id='photodiode-spot'></span>" +
    "</div>"
}

var finish_up = {
  'type': 'html-keyboard-response',
  'choices': jsPsych.NO_KEYS,
  'stimulus': function() { return '<h1>Thank you for particpating, the task has ended.</h1><h4>Data from this task has been saved in the location:</h4><p class="save-location">' + path_to_save+filename + '.</p>' }
}

let debug_timeline = []

let screen_debug = {
  'type': 'html-keyboard-response',
  'stimulus': 'no stimulus',
  'choices': jsPsych.ALL_KEYS,
  'on_start': function(trial) {
    let trial_config = debug_timeline.shift()

    trial.stimulus = trial_config.stimulus

    if (trial_config.record_rating) {
      trial.on_load = function() { 
        flash_PD_spot()
        addRatingListener() 
      }
      trial.on_finish = function(data) {
        removeRatingListener() 
      }
    }
  },
  'on_load': function() { 
    flash_PD_spot() 
  }
}

let debug_loop = {
  'timeline': [screen_debug],
  'loop_function': function() {
    return debug_timeline.length > 0
  }
}

let debug_images = {
  'timeline': [
    {
      'type': 'call-function',
      'func': function() {
        debug_timeline.push(generateFixation()[1])
        for (let ocd_obj of images) {
          for (let image_name of ocd_obj.image_names) {
            debug_timeline.push(generateProvocation(image_name)[1])
          }
        }
        for (let image_name of neutral_images) {
          debug_timeline.push(generateNeutral(image_name)[1])
        }
      }
    },
    debug_loop
  ]
}

function begin() {
  jsPsych.init({
    timeline: [
      // debug_images,
      new_experiment_screen,
      enter_patient_info,
      patient_handover,
      run_experiment,
      finish_up,
    ],
    'preload_images': function() {
      let image_paths = []
      for (let ocd_obj of images) {
        for (let image_name of ocd_obj.image_names) {
          image_paths.push(path_to_images+image_name)
        }
      }
      for (let image_name of neutral_images) {
        image_paths.push(path_to_images+image_name)
      }

      return image_paths
    }()
  })
}

window.onload = function() {
  if (fs.existsSync(path_to_save)) {
    begin()
  }
  else {
    fs.mkdir(path_to_save, function() {
      begin()
    })
  }
}
