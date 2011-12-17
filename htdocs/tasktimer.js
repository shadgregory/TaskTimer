function cmp_passwords () {
    if ($('#new_password').val() == $('#new_password2').val()){
	return true;
    } else {
	$('#message_div').html("The passwords do not match.");
	return false;
    }
}
function logout() {
    YUI().use('cookie', function(Y) {
	Y.Cookie.remove("id");
	window.location = "/";
    });
}

function check_login () {
    if ($('#password').val() == '') {
	$('#message_div').html("Password is required.");
	return false;
    }
    return true;
}

function update_bugnum (st) {
    $.ajax({
    url: "update-bugnum",
    context: document.body,
    data: "starttime=" + $("#starttime_" + st).val() +
        "&bugnumber=" + $("#bug_num_" + st).val()
    });
}

function update_cat (st) {
    $.ajax({
    url: "update-category",
    context: document.body,
    data: "starttime=" + $("#starttime_" + st).val() +
        "&category=" + encodeURIComponent($("#auto_cat" + st).val())
    });
}

function update_notes (st) {
    $.ajax({
    url: "update-comment",
    context: document.body,
    data: "starttime=" + $("#starttime_" + st).val() +
        "&comment=" + $("#comment_" + st).val()
    });
}

function pause(st) {
    $.ajax({
	url: "pause",
	data: "starttime=" + st,
	context:document.body,
	success: function() {
	    $("#pause_" + st).hide();
	    $("#unpause_" + st).show();
	}
    });
}

function unpause(st) {
    $.ajax({
	url: "unpause",
	data: "starttime=" + st,
	context:document.body,
	success: function() {
	    $("#pause_" + st).show();
	    $("#unpause_" + st).hide();
	}
    });
}

function add_task() {
    var d = new Date();
    var task_row = $("<tr id='task_" + 
		     d.getTime() + 
		     "'><td><input type='hidden' value='" + 
		     d.getTime() +
		     "' id='starttime_"+
		     d.getTime() +
		     "'><input type='text' onchange='update_bugnum(" + 
		     d.getTime() + 
		     ")' id='bug_num_"+ 
		     d.getTime() + 
		     "'></td><td><input type='text' onchange='update_cat(" + 
		     d.getTime() + 
		     ")' id='auto_cat" + 
		     d.getTime() + 
		     "'></td><td><input type='text' onchange='update_notes("+ 
		     d.getTime() + 
		     ")' id='comment_" + 
		     d.getTime() + 
		     "'></td><td colspan='3'><button onclick='cancel_task(" + 
		     d.getTime() + 
		     ")'>CANCEL</button><button id='end_"+
		     d.getTime() +
		     "' onclick='end_task(" +
		     d.getTime() + 
		     ")'>END</button><button style='display:inline;' id='pause_" + 
		     d.getTime() + 
		     "' onclick='pause(" +
		     d.getTime() +
		     ")'>PAUSE</button><button style='display:none;' id='unpause_" + 
		     d.getTime() +
		     "' onclick='unpause(" +
		     d.getTime() +
		     ")'>UNPAUSE</button></td></tr>");

    $("#tasks-table tr:last").after(task_row);

    YUI().use('event', 'autocomplete', 'autocomplete-highlighters', function(Y) {
	Y.Event.onAvailable('#auto_cat' + d.getTime(), function(e) {
	    Y.one('#auto_cat'+d.getTime()).plug(Y.Plugin.AutoComplete, {
		resultHighlighter: 'phraseMatch',
		source: ['QA (R&D)','QA (Support)','R&D','R&D Planning','R&D Documentation','Lunch','IT','TEST']
	    });
	});
    });
    $.ajax({
	url: "create-task",
	context: document.body,
	data: "starttime=" + $("#starttime_" + d.getTime()).val() + 
	    "&in-progress=1",
	success: function() {}
    });
}

function end_task(st) {
    var d = new Date();
    if($("#bug_num_"+st).val() == "" &&
       $("#comment_"+st).val() == "") {
	alert("Either bug number or comment is required.");
	return false;
    }

    $.ajax({
	url: "save-task",
	context: document.body,
	data: "bugnumber=" + $("#bug_num_" + st).val() +
	    "&comment=" + encodeURIComponent($("#comment_" + st).val()) +
	    "&category=" + encodeURIComponent($("#auto_cat" + st).val()) +
	    "&starttime=" + $("#starttime_" + st).val() +
	    "&endtime=" + d.getTime(),
	success: function() {
	    alert("task saved");
	    $('#task_' + st).remove();
	}
    });
}

function cancel_task(st) {
    $.ajax({
	url: "remove-doc",
	content: document.body,
	data: "starttime=" +
            $("#starttime_" +st).val()});
    $('#task_' + st).remove();
}

function init() {
    YUI().use("yui2-datatable",
	      "yui2-paginator",
	      "yui2-connection",
	      "autocomplete",
	      "charts",
	      "calendar",
	      "event",
	      "event-base",
	      "tabview",
	      "cookie",
	      function(Y){
		  var YAHOO = Y.YUI2;
		  var id_value = Y.Cookie.get("id");
		  if (id_value == null) {
		      window.location = "/";
		  }
		  var tabview = new Y.TabView({srcNode:'#timertab'});
		  tabview.render();

		  var dataSource = new YAHOO.util.XHRDataSource("get-tasks?");
		  dataSource.responseType = YAHOO.util.XHRDataSource.TYPE_XML;
		  dataSource.responseSchema = { 
		      resultNode: "task", 
		      fields: ["bugnumber","category","comment","hours","enddate"]
		  };
		  dataSource.connMethodPost = true; 
		  YAHOO.widget.DataTable.formatDate = function(el, oRecord, oColumn, oData) {
		      var milliseconds = parseInt(oData);
		      var dateObj = new Date(milliseconds);
		      if(dateObj instanceof Date) {
			  el.innerHTML = (dateObj.getMonth()+1) + "/" + dateObj.getDate() + "/" + dateObj.getFullYear();
		      } else {
			  el.innerHTML = YAHOO.lang.isValue(oData) ? oData : '';
		      }
		  }
		  var cols = [
		      {key:"bugnumber", locator:"*[local-name()='bugnumber']", sortable:true, resizeable:true, label:"Bug Number"},
		      {key:"category",  sortable:true, 
		       locator:"*[local-name()='category']",label:"Category"},
		      {key:"comment", sortable:true, resizeable:true, 
		       locator:"*[local-name()='comment']",label:"Comment"},
		      {key:"hours", sortable:true, resizeable:true, 
		       locator:"*[local-name()='hours']",label:"Hours"},
		      {key:"enddate",  sortable:true, resizeable:true, 
		       locator:"*[local-name()='enddate']",
		       formatter:YAHOO.widget.DataTable.formatDate,
		       label:"End Date"}
		  ];
		  var table = new YAHOO.widget.DataTable("all-tasks", 
							 cols, 
							 dataSource, 
							 {caption:"Tasks",
							  paginator : new YAHOO.widget.Paginator({
							      rowsPerPage: 15
							  })});

		  var tab;
		  Y.on('domready', function(e) {
		      tab = new Y.Tab({
			  label: "Chart",
			  content: '<center><iframe scrolling="no" src="chart.html" height="430" width="430" id="chart-frame"></iframe></center>'
		      });
		      tabview.add(tab);
		      tabview.render();
		  });
		  tabview.on('selectionChange', function(e) {
		      if (e.newVal.get('label') == 'Chart')
    			  document.getElementById('chart-frame').src = 'chart.html';
		      if (e.newVal.get('label') == 'Data') {
			  table.getDataSource().sendRequest(
			      '/get-tasks?', 
			      { success: table.onDataReturnInitializeTable, scope: table });
		      }
		  });
	      });
}
