var current_st = "";
var timer_hash = new Object();
var paused_hash = new Object();
var begin_paused_hash = new Object();
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

function timedRefresh(timeoutPeriod) {
    setTimeout("window.location.reload(true);",timeoutPeriod);
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

function saveComments() {
    $("#comment_" + current_st).val(dialog.getData().ta_dialog);
    $("#comment_img_" + current_st).attr("title",  dialog.getData().ta_dialog);
    update_notes(current_st);
    current_st = "";
    dialog.hide();
}

function show_dialog (st) {
    dialog.setBody("<form name='dlgForm' method='POST'><textarea name='ta_dialog' rows='6' cols='18'>" + 
		   $("#comment_" + st).val() + "</textarea></form>");
    current_st = st;
    dialog.render(document.body);
    dialog.show();
    return false;
}

function update_notes (st) {
    $.ajax({
	url: "update-comment",
	context: document.body,
	data: "starttime=" + $("#starttime_" + st).val() +
            "&comment=" + $("#comment_" + st).val()
    });
}

function update_timer(st){
    var d = new Date();
    var diff = Math.floor((d.getTime() - st - paused_hash[st]) / 1000);
    var hours = Math.floor(diff / 3600);
    var min = Math.floor((diff - (hours * 3600)) / 60);
    var sec = Math.floor(diff - (hours * 3600) - (min * 60));
    if (sec < 10)
	sec = "0" + sec;
    if (min < 10)
	min = "0" + min;
    if (hours < 10)
	hours = "0" + hours;
    $('#timer_'+st).text(hours + ":" + min + ":" + sec);
}

function pause(st) {
    var d = new Date();
    $.ajax({
	url: "pause",
	data: "starttime=" + st +"&begin_paused=" + d.getTime(),
	context:document.body,
	success: function() {
	    $("#pause_" + st).hide();
	    $("#unpause_" + st).show();
	    begin_paused_hash[st] = d.getTime();
	}
    });
    clearInterval(timer_hash[st]);
}

function unpause(st) {
    $.ajax({
	url: "unpause",
	data: "starttime=" + st + "&begin_paused=" + begin_paused_hash[st],
	context:document.body,
	success: function() {
	    $("#pause_" + st).show();
	    $("#unpause_" + st).hide();
	}
    });
    $.ajax({
	url: "get-paused-time",
	data: "starttime=" + st,
	dataType: 'xml',
	context:document.body,
	success: function(data) {
	    var xml = data;
	    $(xml).find("paused_time").each(function(){
		paused_hash[st] = $(this).text();
	    });
	}
    });
    var interval_id = setInterval("update_timer("+st+")",1000);
    timer_hash[st] = interval_id;
}

function start_timer(st) {
    var interval_id = setInterval("update_timer("+st+")",1000);
    timer_hash[st] = interval_id;
    paused_hash[st] = 0;
    $.ajax({
	url: "get-paused-time",
	data: "starttime=" + st,
	dataType: 'xml',
	context:document.body,
	success: function(data) {
	    var xml = data;
	    $(xml).find("paused_time").each(function(){
		paused_hash[st] = $(this).text();
	    });
	}
    });
    return interval_id;
}

function add_task() {
    var d = new Date();
    var month = d.getMonth() + 1;
    var year = d.getFullYear();
    var day = d.getDate();
    var hour = d.getHours();
    var min = d.getMinutes();
    var sec = d.getSeconds();
    if (month < 10)
	month = "0" + month;
    if (day < 10)
	day = "0" + day;
    if (min < 10)
	min = "0" + min;
    if (sec < 10)
	sec = "0" + sec;
    if (hour < 10)
	hour = "0" + hour;
    var task_row = $("<tr id='task_" + 
		     d.getTime() + 
		     "'><td>" +
                     "<img src='pause.png' height='9' style='display:inline;width:25px;height:25px;vertical-align:text-bottom;' id='pause_" +
		     d.getTime() +
                     "' onclick='pause(" +
	    	     d.getTime() + ")'/>" +
                     "<img src='play.png' height='9' style='display:none;width:25px;height:25px;vertical-align:text-bottom;' id='unpause_" +
		     d.getTime() +
                     "' onclick='unpause(" +
	    	     d.getTime() + ")'/></td>" +
		     "<td><input type='hidden' value='" + 
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
		     "'></td><input type='hidden' onchange='update_notes("+ 
		     d.getTime() + 
		     ")' id='comment_" + 
		     d.getTime() + 
		     "'><td style='text-align:center;'><img src='Add_text_icon.png' /" +
		     "title=''" +
		     "id='comment_img_" +
		     d.getTime() +
		     "' onclick='show_dialog(" +
		     d.getTime() + ")'" +
		     "'></td>"+
		     "<td colspan='2'><button onclick='cancel_task(" + 
		     d.getTime() + 
		     ")'>CANCEL</button><button id='end_"+
		     d.getTime() +
		     "' onclick='end_task(" +
		     d.getTime() + 
		     ")'>END</button>" + 
		     "</td><td><div style='font-weight:bold;' id='timer_"+
		     d.getTime()+"'>00:00:00</div></td></tr>");
    start_timer(d.getTime());

    $("#tasks-table tr:last").after(task_row);

    YUI().use('event', 'autocomplete', 'autocomplete-highlighters', function(Y) {
	Y.Event.onAvailable('#auto_cat' + d.getTime(), function(e) {
	    Y.one('#auto_cat'+d.getTime()).plug(Y.Plugin.AutoComplete, {
		resultHighlighter: 'phraseMatch',
		source: ['QA (R&D)','QA (Support)','R&D','R&D Planning','R&D Documentation','Lunch','IT','TEST','Meeting'],
		on : {
		    select : function(e) {
		    }
		}
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
    if($("#bug_num_"+st).val() == "" && $("#comment_"+st).val() == "") {
    	alert("Either bug number or comment is required.");
    	return false;
    }
    if($("#auto_cat" + st).val() == "") {
        alert("Category is required.");
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
    clearInterval(timer_hash[st]);
}

function getElementsByRegExpId(p_regexp, p_element, p_tagName) {
    p_element = p_element === undefined ? document : p_element;
    p_tagName = p_tagName === undefined ? '*' : p_tagName;
    var v_return = [];
    var v_inc = 0;
    for(var v_i = 0, v_il = p_element.getElementsByTagName(p_tagName).length; v_i < v_il; v_i++) {
        if(p_element.getElementsByTagName(p_tagName).item(v_i).id && p_element.getElementsByTagName(p_tagName).item(v_i).id.match(p_regexp)) {
            v_return[v_inc] = p_element.getElementsByTagName(p_tagName).item(v_i);
            v_inc++;
        }
    }
    return v_return;
}

function addNewRule(ruleSet, path, ruleName) {
    var year = path[0];
    var month = path[1];
    var day = path[2];

    if (!ruleSet[path[0]])
	ruleSet[path[0]] = {};
    if (!ruleSet[year][month])
	ruleSet[year][month] = {};
    ruleSet[year][month][day] = ruleName;

    return ruleSet;
}

function init() {
    YUI().use("yui2-datatable",
	      "yui2-paginator",
	      "yui2-connection",
	      "yui2-container",
	      "yui2-animation",
	      "yui2-calendar",
	      "autocomplete",
	      'autocomplete-highlighters',
	      "charts",
	      "calendar",
	      "event",
	      "event-base",
	      "tabview",
	      "cookie",
	      function(Y) {
		  var YAHOO = Y.YUI2;
		  var cat_array = getElementsByRegExpId(/^auto_cat/i, document, "input");
		  for (var i=0;i<cat_array.length;i++) {
		      var id_string = cat_array[i].id;
		      Y.Event.onAvailable('#' + id_string, function(e) {
			  Y.one('#' + id_string).plug(Y.Plugin.AutoComplete, {
			      resultHighlighter: 'phraseMatch',
			      source: ['QA (R&D)','QA (Support)','R&D',
				       'R&D Planning','R&D Documentation',
				       'Lunch','IT','TEST','Meeting']
			  });
		      });
		  }
		  dialog = new YAHOO.widget.Dialog("taskPanel", {
		      draggable:true,
		      fixedcenter:true
		  });
		  dialog.setHeader("Comments");
		  dialog.setBody("<textarea id='ta_dialog' row='6' cols='18'></textarea>");
		  var myButtons = [
		      {text: "Save", handler: saveComments, isDefault: true},
		      {text: "Cancel", handler: function() { dialog.hide();}}
		  ];
		  dialog.cfg.queueProperty("buttons", myButtons);
		  dialog.render(document.body);
		  dialog.hide();
		  var id_value = Y.Cookie.get("id");
		  if (id_value == null) {
		      window.location = "/";
		  }

		  var calendar = new Y.Calendar({
		      contentBox: "#cal"
		  });
//		  var calendar = new YAHOO.widget.Calendar("cal");
		  var tabview = new Y.TabView({srcNode:'#timertab'});
		  tabview.render();
		  
		  var dataSource = new YAHOO.util.XHRDataSource("get-tasks?");
		  dataSource.responseType = YAHOO.util.XHRDataSource.TYPE_XML;
		  dataSource.responseSchema = { 
		      resultNode: "task", 
		      fields: ["bugnumber","category","comment","hours","starttime","enddate"]
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
		  var ttTextboxCellEditor = new YAHOO.widget.TextboxCellEditor({
		      validator:YAHOO.widget.DataTable.validateNumber
		  });
		  ttTextboxCellEditor.subscribe("saveEvent", function(args){
		      $.ajax({
			  url: "update-endtime",
			  context: document.body,
			  data: "starttime=" + args.editor.getRecord().getData().starttime +
			      "&hours=" + args.newData
		      });
		  });
		  var cols = [
		      {key:"bugnumber", locator:"*[local-name()='bugnumber']", 
		       sortable:true, resizeable:true, label:"Bug Number"},
		      {key:"category",  sortable:true, 
		       locator:"*[local-name()='category']",label:"Category"},
		      {key:"comment", sortable:true, resizeable:true, 
		       locator:"*[local-name()='comment']",label:"Comment"},
		      {key:"hours", sortable:true, resizeable:true, 
		       editor: ttTextboxCellEditor,
		       locator:"*[local-name()='hours']",label:"Hours"},
                      {key:"starttime",locator:"[local-name()='starttime']"},
		      {key:"enddate",  sortable:true, resizeable:true, 
		       locator:"*[local-name()='enddate']",
		       formatter:YAHOO.widget.DataTable.formatDate,
		       parser: 'date',
		       label:"End Date"}
		  ];
		  var table = new YAHOO.widget.DataTable(
		      "all-tasks", 
		      cols, 
		      dataSource, 
		      {caption:"Tasks",
		       paginator : new YAHOO.widget.Paginator({
			   rowsPerPage: 16
		       })});
		  table.subscribe("cellClickEvent", table.onEventShowCellEditor);
                  table.hideColumn(table.getColumn(4));

		  var tab;
		  Y.on('domready', function(e) {
		      tab = new Y.Tab({
			  label: "Chart",
			  content: 
			  '<center><iframe scrolling="no" height="430" width="430" id="chart-frame"></iframe></center>'
		      });
		      tabview.add(tab);
		      tabview.render();
		      $.ajax({
			    type: "GET",
			    url: "get-tasks",
			    dataType: 'xml',
			    context:document.body,
			    success: function(xml) {
			      $(xml).find('tasks').each(function(){
				  var rules = {};
				  $(this).find('task').each(function(){
				      var enddate = Math.floor($(this).find('enddate').text());
				      var d = new Date(enddate);
				      var y = d.getFullYear();
				      var m = d.getMonth();
				      var day = d.getDate();
				      rules = addNewRule(rules, [y, m, day], "dates-with-entries");
				      var filterFunction = function (date, node, rules) {
					  if (rules.indexOf("dates-with-entries" >= 0))
			                      node.addClass("redtext");
				      };
				      calendar.set("customRenderer", {rules: rules, filterFunction: filterFunction});
				  });
			      });
			    }
		      });
		      calendar.render();
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
		  AlertDialog = new YAHOO.widget.SimpleDialog("dlg1", {
		      width: "200px",
		      effect:{effect:YAHOO.widget.ContainerEffect.FADE,duration:0.15},
		      fixedcenter:true,
		      modal:true,
		      visible:false,
		      close: true,
		      constraintoviewport: true,
		      buttons: [ { text:"ok", handler: function(){this.hide();}, isDefault:true }],
		      draggable:false,
		      effect: [
			  { effect:YAHOO.widget.ContainerEffect.FADE,duration:0.1 }]
		  });

		  AlertDialog.setHeader("Alert");
		  AlertDialog.render(document.body);
		  window.alert = function(text) {
		      AlertDialog.cfg.setProperty("text",text);
		      AlertDialog.show();
		  };
	      });
}
