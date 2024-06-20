document.addEventListener("DOMContentLoaded", function () {
  let localDbValues = [100]; // array to store db values for each loop within the refresh_rate
  let refresh_rate = 100;
  let color = "green";
  let stream;
  let offset = 0;
  let date;
  let isRunning = true; // variable to track whether the system is running or stopped
  let isPlaying = false;
  let activeAudios = []; // array to keep track of active audio objects

  // Tableau de fichiers audio
  const audioFiles = [
    "sound/sound01.mp3",
    "sound/sound02.mp3",
    "sound/sound03.mp3",
    "sound/sound04.mp3",
    "sound/sound05.mp3",
    "sound/sound06.mp3",
    "sound/sound07.mp3",
  ];

  // Fonction pour sélectionner un fichier audio au hasard
  const getRandomAudio = () => {
    const randomIndex = Math.floor(Math.random() * audioFiles.length);
    return new Audio(audioFiles[randomIndex]);
  };

  // Function to stop the dB meter
  function stopDbMeter() {
    isRunning = false;
    clearInterval(interval); // Stop the interval

    // Stop all active audio objects
    activeAudios.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0; // Reset audio to start
    });
    activeAudios = [];
  }

  // Function to start the dB meter
  function startDbMeter() {
    isRunning = true;
    interval = setInterval(updateDb, refresh_rate); // Start the interval
  }

  // Function to handle button click
  document.querySelector("button").addEventListener("click", function () {
    if (isRunning) {
      // If the system is running, prompt for password to stop
      document.getElementById("passwordOverlay").style.display = "block";
    } else {
      // If the system is already stopped, start it again
      startDbMeter();
    }
  });

  // Function to handle password submission
  document
    .getElementById("passwordForm")
    .addEventListener("submit", function (event) {
      event.preventDefault(); // Prevent the form from submitting
      const password = document.getElementById("passwordInput").value;
      if (password === "090224") {
        stopDbMeter(); // Stop the dB meter if password is correct
        document.getElementById("passwordOverlay").style.display = "none"; // Hide the password overlay
      }
    });

  navigator.mediaDevices
    .getUserMedia({ audio: true, video: false })
    .then((stream) => {
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(2048, 1, 1);
      const analyser = context.createAnalyser();

      analyser.smoothingTimeConstant = 0.8;
      analyser.fftSize = 256;

      source.connect(analyser);
      analyser.connect(processor);
      processor.connect(context.destination);

      processor.onaudioprocess = () => {
        if (!isRunning) return; // Stop processing if not running

        let data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        let rms = 0;

        for (var i = 0; i < data.length; i++) {
          if (data[i] > 120) data[i] = 120;
          rms += data[i] * data[i];
        }
        rms = Math.sqrt(rms / data.length);

        let value = rms + offset;
        localDbValues.push(value);

        // PAGNA - Plus élevé = moins sensible, Moins élevé = plus sensible
        if (value >= 90 && !isPlaying) {
          const audio = getRandomAudio();
          audio.play();
          isPlaying = true;
          activeAudios.push(audio); // Add the audio object to the activeAudios array

          // Définir un délai avant de pouvoir rejouer un son
          setTimeout(() => {
            isPlaying = false;
          }, 3000); // Délai de 3 secondes entre chaque son
        }
      };
    });

  let updateDb = function () {
    window.clearInterval(interval);

    const db = document.getElementById("db");
    let volume = Math.round(
      localDbValues.reduce((a, b) => a + b, 0) / localDbValues.length
    );
    if (!isFinite(volume)) volume = 0;

    db.innerText = volume;
    localDbValues = [];

    if (volume >= 100) {
      volume = 100;
    }

    // Calculez l'angle de rotation en fonction du volume
    let rotationOffset = 0; // Ajoutez l'offset souhaité
    let rotationAngle = 0 * 1 + rotationOffset; // Ajustez le facteur selon la sensibilité souhaitée
    let remaped = map_range(volume, 0, 100, -60, 58);

    // Appliquez la rotation à l'élément .barre
    document.querySelector(".barre").style.transform = `rotate(${remaped}deg)`;

    changeUpdateRate();
    interval = window.setInterval(updateDb, refresh_rate);
  };
  let interval = window.setInterval(updateDb, refresh_rate);

  function map_range(value, low1, high1, low2, high2) {
    return low2 + ((high2 - low2) * (value - low1)) / (high1 - low1);
  }

  // change the visualization colors according to the dbValue
  function changeColor(decibels) {
    if (decibels < 50) {
      color = "green";
    } else if (decibels >= 50 && decibels < 70) {
      color = "yellow";
    } else if (decibels >= 70 && decibels < 90) {
      color = "orange";
    } else {
      color = "red";
    }

    //document.getElementById("visuals").style.height = dbValue + "px";
    document.getElementById("visuals").style.width =
      (decibels * 2) / 10 + "rem";
    if (decibels >= 70)
      document.getElementById("visuals").style.background = "red";
    else document.getElementById("visuals").style.background = "black";
    document.getElementById("db").style.color = color;
  }

  // change update rate
  function changeUpdateRate() {
    refresh_rate = 100; // Vous avez indiqué que la mise à jour doit être effectuée toutes les 100ms
  }

  // update the date of last project's version
  let xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      let repos = JSON.parse(this.responseText);
      repos.forEach((repo) => {
        if (repo.name == "db-meter") {
          date = new Date(repo.pushed_at);
          document.getElementById("date").innerText = date.toLocaleDateString();
        }
      });
    }
  };
  xhttp.open("GET", "https://api.github.com/users/takispig/repos", true);
  xhttp.send();
});
