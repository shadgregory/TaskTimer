Array.prototype.unique = function() {
    var a = [];
    var l = this.length;
    for(var i=0; i<l; i++) {
	for(var j=i+1; j<l; j++) {
	    if (this[i] === this[j])
		j = ++i;
	}
	a.push(this[i]);
    }
    return a;
};
//credits: http://www.netlobo.com/url_query_string_javascript.html
function gup(url, name) {
    name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
    var regexS = "[\\#&]"+name+"=([^&#]*)";
    var regex = new RegExp( regexS );
    var results = regex.exec( url );
    if( results == null )
        return "";
    else
        return results[1];
}

//http://www.tutorialspoint.com/javascript/array_filter.htm
if (!Array.prototype.filter) {
    Array.prototype.filter = function(fun /*, thisp*/) {
	var len = this.length;
	if (typeof fun != "function")
	    throw new TypeError();

	var res = new Array();
	var thisp = arguments[1];
	for (var i = 0; i < len; i++) {
	    if (i in this) {
		var val = this[i]; // in case fun mutates this
		if (fun.call(thisp, val, i, this))
		    res.push(val);
	    }
	}

	return res;
    };
}

function validateToken(token) {
    var VALIDURL    =   'https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=';
    $.ajax({
        url: VALIDURL + token,
        data: null,
        success: function(responseText){  
            getUserInfo();
        },  
        failure: function(responseText){  
            document.location = "/?msg=baduser";
        },  
        dataType: "jsonp"  
    });
}

function getUserInfo() {
    $.ajax({
        url: 'https://www.googleapis.com/oauth2/v1/userinfo?access_token=' + acToken,
        data: null,
        success: function(resp) {
            user    =   resp;
	    verified_email = user.verified_email;
	    if (verified_email) {
		$.ajax({
		    url:"/oauth-user",
		    data:{username : user.email},
		    success:function(xml){
			$(xml).find("cookie").each(function(){
			    YUI().use('cookie', function (Y) {
				Y.Cookie.set("id", 
					     user.email + "-" + $(this).text(),
					     {secure : true}
					    );
				document.cookie = "id="+user.email+"-"+$(this).text() + ";secure=true";
				document.location = "/timer?username="+user.email;
			    });
			});

		    }
		});

	    } else {
		$.ajax({
		    url:"/",
		    data:{msg : "baduser"}
		});
	    }
        },
        dataType: "jsonp"
    });
}

String.prototype.trim = function() {
    return this.replace(/^\s+|\s+$/g,"");
}         
var current_st = "";
var timer_hash = new Object();
var paused_hash = new Object();
var begin_paused_hash = new Object();
var categoryArray = new Array();
var employeeArray = new Array();
var monthname = new Array("January","Feburary","March",
			  "April","May","June","July",
			  "August","September","October",
			  "November","December");
function suppressNonNumericInput(event){
    if( !(event.keyCode == 8                                // backspace
          || event.keyCode == 46                              // delete
          || (event.keyCode >= 35 && event.keyCode <= 40)     // arrow keys/home/end
	  || event.keyCode == 190 || event.keyCode == 188 
	  || event.keyCode == 109 || event.keyCode == 110 
          || (event.keyCode >= 48 && event.keyCode <= 57)     // numbers on keyboard
          || (event.keyCode >= 96 && event.keyCode <= 105))) {
            event.preventDefault();     // Prevent character input
    }
}

function cmp_passwords () {
    if ($('#new_password').val() == $('#new_password2').val()){
	    return true;
    } else {
	    $('#message_div').html("The passwords dpo not match.");
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

function update_cat (st) {
    $.ajax({
	url: "update-category",
	context: document.body,
	data: "starttime=" + $("#starttime_" + st).val() +
            "&category=" + encodeURIComponent($("#auto_cat" + st).val())
    });
}

function add_row(table_id, cat_value, hours_value, note_value, verified, yui2, bsonid_value) {
    var tb = document.getElementById(table_id);
    var lastRow = tb.rows.length; 
    var row = tb.insertRow(lastRow); 
    var buttoncell = row.insertCell(0); 
    var deleteButton = document.createElement("input");
    deleteButton.value = "X";
    deleteButton.type = "button";
    deleteButton.style.color = "red";
    deleteButton.onclick = function() {
	var i=this.parentNode.parentNode.rowIndex;
	document.getElementById(table_id).deleteRow(i-2);
    };
    buttoncell.appendChild(deleteButton);
    var catcell = row.insertCell(1); 
    var acDiv = document.createElement("div"); 
    acDiv.id = "myAutoComplete";
    var hcDiv = document.createElement("div"); 
    hcDiv.id = "hourscomplete";
    var noteDiv = document.createElement("div"); 
    noteDiv.id = "tasknotes";
    var catDiv = document.createElement("div"); 
    catDiv.id = "categorycomplete";
    var catcontr = document.createElement("div");
    catcontr.id = "categorycontainer" + lastRow;
    var hourscontr = document.createElement("div");
    hourscontr.id = "hourscontainer" + lastRow;
    var notescontr = document.createElement("div");
    notescontr.id = "notescontainer" + lastRow;
    var catinput = document.createElement("input"); 
    catinput.type = "text";
    catinput.name = "category" + lastRow;
    catinput.id = "category" + lastRow;
    catinput.value = cat_value;
    catDiv.appendChild(catinput);
    if (bsonid_value) {
	var bsonid = document.createElement("input");
	bsonid.type = "hidden";
	bsonid.id = "bsonid" + lastRow;
	bsonid.value = bsonid_value;
	catDiv.appendChild(bsonid);
    }
    catDiv.appendChild(catcontr);
    catcell.appendChild(catDiv);
    var notescell = row.insertCell(2); 
    var hourscell = row.insertCell(3); 
    var hoursinput = document.createElement("input"); 
    var notesinput = document.createElement("input"); 
    hoursinput.type = "text"; 
    hoursinput.onkeydown = suppressNonNumericInput;
    notesinput.type = "text"; 
    hoursinput.name = "hours" + lastRow;
    notesinput.name = "note" + lastRow;
    hoursinput.id = "hours" + lastRow;
    notesinput.id = "note" + lastRow;
    hoursinput.value = hours_value;
    hoursinput.size = 4;
    hoursinput.className += " numberinput";
    notesinput.value = note_value;
    hcDiv.appendChild(hoursinput);
    hcDiv.appendChild(hourscontr);
    noteDiv.appendChild(notesinput);
    noteDiv.appendChild(notescontr);
    hourscell.appendChild(hcDiv);
    notescell.appendChild(noteDiv);
    YUI().use('event', 'autocomplete', 'autocomplete-highlighters', function(Y) {
	Y.Event.onAvailable('#category' + lastRow, function(e) {
	    Y.one('#category' + lastRow).plug(Y.Plugin.AutoComplete, {
		resultHighlighter: 'phraseMatch',
		source: categoryArray,
		on : {
		    select : function(e) {
		    }
		}
	    });
	});
    });
    if (verified) {
	notesinput.disabled = true;
	hoursinput.disabled = true;
	catinput.disabled = true;
    }
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

function get_username() {
    var username;
    var db_cookieid;
    YUI().use('cookie', function (Y) {
	var value = Y.Cookie.get("id");
	username = value.split("-")[0];
	db_cookieid = value.split("-")[1];
    });
    return username;	      
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
	    	     d.getTime() + ")'/>" +
		     "<input type='hidden' value='" + 
		     d.getTime() +
		     "' id='starttime_"+
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
		source: categoryArray,
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
	data: "username=" + get_username() + 
	    "&starttime=" + $("#starttime_" + d.getTime()).val() + 
	    "&in-progress=1",
	success: function(xml) {
	    $(xml).find('task').each(function(){
		var bsonid_value = $(this).find('bsonid').text();
		var tr_el = document.getElementById('task_'+ d.getTime());
		var bsonid = document.createElement("input");
		bsonid.type = "hidden";
		bsonid.id = "bsonid_" + d.getTime();
		bsonid.value = bsonid_value;
		tr_el.appendChild(bsonid);
	    });
	}
    });
}

function end_task(st) {
    var d = new Date();
    if($("#auto_cat" + st).val() == "") {
        alert("Category is required.");
        return false;
    }

    $.ajax({
	url: "save-task",
	context: document.body,
	data:
	    "comment=" + encodeURIComponent($("#comment_" + st).val()) +
	    "&category=" + encodeURIComponent($("#auto_cat" + st).val()) +
	    "&starttime=" + $("#starttime_" + st).val() +
	    "&bsonid=" + encodeURIComponent($("#bsonid_" + st).val()) +
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

(function(){
    var po = document.createElement('script'); po.type = 'text/javascript'; po.async = true;
    po.src = 'https://apis.google.com/js/plusone.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(po, s);
})();

function init() {
    YUI_config = {
	combine: false,
	filter: "raw",
	comboBase: "/combo?",
	base: '/yui/build/',
	root: 'yui/build/',
	groups:{
	    yui2:{
		base: '/2in3/dist/build/',
		patterns: {
		    'yui2-':{
			configFn: function(me) {
                            if(/-skin|reset|fonts|grids|base/.test(me.name)) {
                                me.type = 'css';
                                me.path = me.path.replace(/\.js/, '.css');
                                me.path = me.path.replace(/\/yui2-skin/, '/assets/skins/sam/yui2-skin');
                            }
                        }
		    }
		}
	    }
	}
    };


    YUI().use("yui2-datatable",
	      "yui2-paginator",
	      "yui2-connection",
	      "yui2-container",
	      "yui2-animation",
	      "autocomplete",
	      'autocomplete-highlighters',
	      "charts",
	      "calendar",
	      "event",
	      "event-base",
	      "tabview",
	      "cookie",
	      function(Y) {
		  var yui2 = Y.YUI2;
		  var cat_array = getElementsByRegExpId(/^auto_cat/i, document, "input");
		  for (var i=0;i<cat_array.length;i++) {
		      var id_string = cat_array[i].id;
		      Y.Event.onAvailable('#' + id_string, function(e) {
			  Y.one('#' + id_string).plug(Y.Plugin.AutoComplete, {
			      resultHighlighter: 'phraseMatch',
			      source: categoryArray
			  });
		      });
		  }
		  dialog = new yui2.widget.Dialog("taskPanel", {
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
		  
		  var update_pending = function(datatable) {
		      var records = datatable.getRecordSet();
		      if (!records.getRecord(0))
			  return;
		      var len = records._records.length-1;
		      var taskData = new Array();
		      var url_string = 'verify?';
		      for (var i=0;i<=len;i++) { 
			  var rec = records.getRecord(i);
			  if (rec.getData('Verify')) {
			      url_string = url_string.concat("bsonid=" + encodeURIComponent(rec.getData('Bsonid')));
			  }
		      }
		      url_string = url_string.concat("&username=" + encodeURIComponent(records.getRecord(0).getData('Username')));
		      var transaction = yui2.util.Connect.asyncRequest(
			  'GET', url_string,
			  {success:function(o){eval(o.responseText);},failure:function(o){alert(o.responseText);}});
		  };

		  var calendar = new Y.Calendar({
		      contentBox: "#cal"
		  });
		  var cal_dialog = new yui2.widget.Dialog("calDialog", {
		      close:true,
		      visible:false,
		      constraintoviewport: true,
		      width:500,
		      fixedcenter:true,
		      draggable:true});

		  calendar.on("dateClick", function (ev) {
		      var newDate = ev.date;
		      var month   = Y.DataType.Date.format(newDate, {format:"%m"});
		      var day     = Y.DataType.Date.format(newDate, {format:"%e"});
		      var year    = Y.DataType.Date.format(newDate, {format:"%Y"});
     		      var addBlankRow = function() {
			  add_row("tbody-"+month+day+year,"","","","","",yui2); 
		      };
		      var saveTasks = function() {
			  var tbod = document.getElementById('tbody-'+month+day+year);
			  var cat_array = getElementsByRegExpId(/^category/i, document, "input");
			  var hours_array = getElementsByRegExpId(/^hours/i, document, "input");
			  var notes_array = getElementsByRegExpId(/^note/i, document, "input");
			  var bsonid_array = getElementsByRegExpId(/^bsonid/i, document, "input");
			  var begin_date = new Date(year, (month - 1), day);
			  for (var i = 0;i<cat_array.length;i++) {
			      var hours = Math.floor(hours_array[i].value);
			      var min = Math.floor((hours_array[i].value - hours) * 60);
			      var sec = (hours_array[i].value * 3600) % 60 % 60;
			      var end_date = new Date(year, (month - 1), day, hours, min, sec, 0);
			      var data_string = "comment=" + encodeURIComponent(notes_array[i].value) +
				  "&category=" + encodeURIComponent(cat_array[i].value) +
				  "&hours=" + hours_array[i].value + 
				  "&starttime=" + begin_date.getTime() +
				  "&endtime=" + end_date.getTime();
			      if (bsonid_array[i].value.trim() != "[object Object]")
				  data_string = data_string.concat("&bsonid=" + bsonid_array[i].value);
			      $.ajax({
				  url: "save-task"
				  ,context: document.body
				  ,data: data_string
				  ,success: cal_dialog.hide()
			      });
			  }
		      };
		      var myButtons = [
			  {text: "Add Task", handler: addBlankRow, isDefault:true},
			  {text: "Save", handler: saveTasks},
			  {text: "Cancel", handler: function(){cal_dialog.hide();}}
		      ];
		      cal_dialog.cfg.queueProperty("buttons", myButtons);
		      cal_dialog.setHeader("Enter time for " + month + "/" + day + "/" + year + ":");
		      cal_dialog.setBody('<table id="table-'+month+day+year+'"> \
                                          <thead><tr><td></td><td><b>Category</b> \
                                          </td><td><b>Notes</b></td><td><b>Hours</b></td></tr></thead> \
                                          <tbody id="tbody-'+month+day+year+'"></tbody></table>');
		      $.ajax({
			  type: "GET",
			  url: "get-tasks-with-date",
			  dataType: "xml",
			  data: "month=" + month + "&day="+day.trim()+"&year="+year,
			  success: function(xml) {
			      $(xml).find('tasks').each(function(){
				  $(this).find('task').each(function(){
				      var category = $(this).find('category').text();
				      var comment = $(this).find('comment').text();
				      var hours = $(this).find('hours').text();
				      var bsonid = $(this).find('bsonid').text();
				      add_row('table-'+month+day+year,category,hours,comment,false,yui2,bsonid);
				  });
			      });
			  }
		      });

		      cal_dialog.render(document.body);
		      cal_dialog.show();
		  });
		  var tabview = new Y.TabView({srcNode:'#timertab'});
		  tabview.render();
		  
		  var dataSource = new yui2.util.XHRDataSource("get-tasks?");
		  dataSource.responseType = yui2.util.XHRDataSource.TYPE_XML;
		  dataSource.responseSchema = { 
		      resultNode: "task", 
		      fields: ["bugnumber","category","comment","hours","starttime","enddate","bsonid"]
		  };
		  dataSource.connMethodPost = true; 
		  yui2.widget.DataTable.formatDate = function(el, oRecord, oColumn, oData) {
		      var milliseconds = parseInt(oData);
		      var dateObj = new Date(milliseconds);
		      if(dateObj instanceof Date) {
			  el.innerHTML = (dateObj.getMonth()+1) + "/" + dateObj.getDate() + "/" + dateObj.getFullYear();
		      } else {
			  el.innerHTML = yui2.lang.isValue(oData) ? oData : '';
		      }
		  }
		  var ttTextboxCellEditor = new yui2.widget.TextboxCellEditor({
		      validator:yui2.widget.DataTable.validateNumber
		  });
		  ttTextboxCellEditor.subscribe("saveEvent", function(args){
		      $.ajax({
			  url: "update-endtime",
			  context: document.body,
			  data: "starttime=" + args.editor.getRecord().getData().starttime +
			      "&bsonid=" + encodeURIComponent(args.editor.getRecord().getData().bsonid) +
			      "&hours=" + args.newData
		      });
		  });
		  var cols = [
		      {key:"category",  sortable:true, 
		       locator:"*[local-name()='category']",label:"Category"},
		      {key:"comment", sortable:true, resizeable:true, 
		       locator:"*[local-name()='comment']",label:"Comment"},
		      {key:"hours", sortable:true, resizeable:true, 
		       editor: ttTextboxCellEditor,
		       locator:"*[local-name()='hours']",label:"Hours"},
                      {key:"enddate",locator:"[local-name()='enddate']",
		       formatter:yui2.widget.DataTable.formatDate,
		       sortable:true, resizeable:true,
		       parser: 'date',
		       label:"Date"},
		      {key:"bsonid",locator:"*[local-name()='bsonid']"}
		  ];
		  var table = new yui2.widget.DataTable(
		      "all-tasks", 
		      cols, 
		      dataSource, 
		      {caption:"Tasks",
		       paginator : new yui2.widget.Paginator({
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
		      $("body").css("cursor", "progress");
		      protab = new Y.Tab({
			  label: "Pro",
			  content:
			  '<div height="430"><h2>Coming soon!</h2></div>'
		      });
		      tabview.add(protab);
		      tabview.render();
		      
		      $.ajax({
			  type: "GET",
			  url: "get-employees",
			  dataType: 'xml',
			  context:document.body,
			  success: function(xml){
			      var tasksObj = new Object();
			      var dataTable;
			      var employee_count = 0;

			      //Parse employees xml and populate tasksObj
			      $(xml).find('employee').each(function(){
				  var tasksArray = new Array();
				  employee_count++;
				  var username = $(this).attr("username");
				  $(this).find('tasks').each(function(){
				      $(this).find('task').each(function(){
					  var verified = false;
					  if ($(this).find('verified').text() == 'T')
					      verified = true;
					  var d = new Date(parseInt($(this).find('endtime').text()));
					  var y = d.getFullYear();
					  var m = d.getMonth();
					  var day = d.getDate();
					  tasksArray.push({
					      Hours : $(this).find('hours').text(), 
					      Date: monthname[m] + " " + day + ", " + y,
					      Category : $(this).find('category').text(),
					      Bsonid : $(this).find('bsonid').text(),
					      Username: username,
					      Verified : verified
					  });
				      });

				      tasksObj[username] = tasksArray;
				  });
			      });

			      if (employee_count > 0)
				  $("#employees_link").show();
			      $("#employees_link").click(function(){
				  updateTable = function(key, show_all){
                                      if (dataTable) {                                                       
					  var callback = {
                                              success: dataTable.onDataReturnInitializeTable,                                       
                                              failure: dataTable.onDataReturnAppendRows,                                            
                                              scope: dataTable,                                                                     
                                              argument: {}                                                                          
					  };
					  var myObj = new Object();
					  if (show_all) {
					      myObj = tasksObj;
					  } else {
					      for (var x in tasksObj) {
						  myObj[x] = tasksObj[x].filter(function(element, index, array){
						      if (!element.Verified)
							  return element
						  });
					      }
					  }
					  dataTable.getDataSource().liveData = myObj[key];
					  dataTable.getDataSource().sendRequest(null,
										{success: dataTable.onDataReturnInitializeTable,
										 failure: dataTable.onDataReturnAppendRows,
										 argument: dataTable.getState()},
										dataTable);
					  dataTable.render();
				      }                                                                      
				  };
				  var myArray = new Array();
				  for (var x in tasksObj) {
				      myArray.push(x);
				  }
				  myArray = myArray.sort();
				  var first_emp = myArray[0];
				  var dataSource = new yui2.util.DataSource(tasksObj[first_emp].filter(
				      function(element, index, array) {
					  if (!element.Verified)
					      return element;
				      }
				      ),{
				      responseType : yui2.util.DataSource.TYPE_JSARRAY,
				      responseSchema : {
					  fields : [{key:'Verified',parser:yui2.util.DataSource.parseBoolean}
						    ,{key:'Date',parser:"date"}
						    ,{key:'Hours',parser:"number"}
						    ,{key:'Bsonid',hidden:true}
						    ,{key:"Username",hidden:true}
						    ,{key:'Category',parser:"string"}]
				      }
				  });
				  var msgPanel = new yui2.widget.SimpleDialog("dlg", {modal:true,fixedcenter:true,draggable:true});
				  var body_str = "<table><tr><td><select id=employees onchange=\"updateTable(this.options[this.selectedIndex].value)\">";
				  for (var i=0;i<myArray.length;i++){
				      body_str += '<option value="'+ myArray[i] +'">' + myArray[i] + '</option>';
				  }
				  body_str += "</select></td>";
				  body_str += "<td style=padding-left:5px><label for=show_verified>Show Verified : </label><input name=show_verified id=show_verified type=checkbox onclick=updateTable(document.getElementById(\"employees\").options[document.getElementById(\"employees\").selectedIndex].value,document.getElementById(\"show_verified\").checked)> </td>";
				  body_str += "</tr></table>";
				  body_str += "<div id=datatable></div>";
				  msgPanel.setHeader("Employees");
				  msgPanel.cfg.setProperty("icon", yui2.widget.SimpleDialog.ICON_INFO); 
				  var myButtons = [{ text: "OK", handler: 
						     function(){
							 update_pending(dataTable);this.hide();
						     }
						   }];
				  msgPanel.cfg.queueProperty("buttons", myButtons); 
				  msgPanel.setBody(body_str);
				  msgPanel.render(document.body);
				  msgPanel.show();
				  dataTable = new yui2.widget.DataTable(
				      "datatable",
				      [
					  {key:"Verify",formatter:"checkbox", resizeable:true},
					  {key:"Date", formatter:"date", sortable:true, resizeable:true},
					  {key:"Hours",formatter:"number",
					   sortable:true, resizeable:true},
					  {key:"Category",sortable:true, resizeable:true},
					  {key:"Bsonid",hidden:true},
					  {key:"Username",hidden:true}
				      ], 
				      dataSource, {paginator: 
				       new yui2.widget.Paginator({rowsPerPage:8})});


                                  dataTable.subscribe("checkboxClickEvent", function(oArgs){
                                      var elCheckbox = oArgs.target;                                            
                                      var oRecord = this.getRecord(elCheckbox);                                 
                                      oRecord.setData("Verify",elCheckbox.checked);                             
				  });
			      });
			      $("body").css("cursor", "auto");
			  }
		      });
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
				      categoryArray.push($(this).find('category').text());
				      categoryArray = categoryArray.unique();
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
		  AlertDialog = new yui2.widget.SimpleDialog("dlg1", {
		      width: "200px",
		      effect:{effect:yui2.widget.ContainerEffect.FADE,duration:0.15},
		      fixedcenter:true,
		      modal:true,
		      visible:false,
		      close: true,
		      constraintoviewport: true,
		      buttons: [ { text:"ok", handler: function(){this.hide();}, isDefault:true }],
		      draggable:false,
		      effect: [
			  { effect:yui2.widget.ContainerEffect.FADE,duration:0.1 }]
		  });

		  AlertDialog.setHeader("Alert");
		  AlertDialog.render(document.body);
		  window.alert = function(text) {
		      AlertDialog.cfg.setProperty("text",text);
		      AlertDialog.show();
		  };
	      });
}
