$(".deleteUser").on("click", confirmDelUser);

    function confirmDelUser() {
      let delUser = confirm("Are you sure you want to delete this user?" + $(this).next().html() );

      if (delUser == true) {
        let userID = $(this).attr("id");


        window.location.href = "/deleteAccount?userID="+userID;
      }
    }