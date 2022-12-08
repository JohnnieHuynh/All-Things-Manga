addStates();

    //Get ZIPCODE when entered
    window.updateZip = function() {
      //URLS for ZIPs
      let zipURL = "https://cst336.herokuapp.com/projects/api/cityInfoAPI.php?zip=";

      //Get User Input ZIP
      let userZip = $("#zipBox").val();

      //Combine Strings
      let newURL = zipURL.concat(userZip);

      //Fetch Data
      $.getJSON(newURL, function(data) {

        //Assign Data to var
        let zipCity = data.city;

        //Display City
        document.getElementById("city").innerHTML = zipCity;

        //If no ZIP is found
        if (data.zip == null) {
          //Display Not Found Msg
          document.getElementById("zipFeedback").innerHTML = "ZIP not found"

          //Display Empty City
          document.getElementById("city").innerHTML = "";
        }

      })
    }

    //Add States to Dropdown Bar
    function addStates() {
      var stateURL = "https://cst336.herokuapp.com/projects/api/state_abbrAPI.php";

      $.getJSON(stateURL, function(data) {
        //Get Size of JSON Arr
        let len = data.length;

        //Get Reference
        let selState = document.getElementById("stateBox");

        //Fill Options
        for (var b = 0; b < len; b++) {
        //Create Option
        var opt = document.createElement('option');
        var currentState = data[b].state;

        opt.appendChild(document.createTextNode(currentState));

        //Set Value for each
        opt.value = currentState;

        //Add to Select
        selState.appendChild(opt);

        } 
      })
    }