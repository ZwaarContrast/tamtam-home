/*
* Script for searching records in KennisKlep
*
* Version: 1.0
*
* Author: Danny Hoek
*
* Contact: postduif@zwaarcontrast.nl
*
*/
(function($, window, document, undefined) {
	"use strict";

	//Constructor
	var SearchRecords = function(elem, options) {
		this.element = $(elem);
		this.$element = $(elem);
		this.options = options;
	};

	//Prototype
	SearchRecords.prototype = {

		defaults: {
			searchForm:'.top-bar-search',
			resultContainer:'.search-results',
			sendMailButton:'.saved-actions-button-mail',
			emailForm:'.saved-actions-form',
			savedContainer:'.saved-items',
			noSavedRecords:'.saved-items-noresult',
			topSavedAmount:'.top-bar-saved-button-amount',
			emptySavedRecordsButton:'.saved-actions-button-delete',
			filters:'.top-bar-filter-link',
			notification:'.search-results-notification',
			notificationText:'.search-results-notification-message',
			emailNotificationSuccess:'.saved-notifications-success',
			emailNotificationFailed:'.saved-notifications-failed',
			lastResultFilter:'Dit zijn alle resultaten binnen dit filter',
			lastResult:'Dit zijn alle resultaten!',
			noResultFilter:'Geen resultaten gevonden binnen dit filter',
			noResult:'Geen resultaten gevonden',
			groupButton:'.top-bar-filter-link-group',
			groupList:'.top-bar-group',
			groups:'.top-bar-group-link'
		},

		//Initialisation
		init: function() {
			//Get the options and merge with defaults
			this.config = $.extend({}, this.defaults, this.options, this.metadata);

			//Global variables
			//Previous search term
			this.prevSearchTerm = '';

			//The search term
			this.searchTerm = '';

			//The filter
			this.currentFilter = '';

			//The group
			this.currentGroup = '';

			//Total records found (Defaults to zero records)
			this.totalRecords = 0;

			//Amount of records fetched in the current search
			this.fetched = 0;

			//Array containing found records
			this.foundRecords = [];

			//Array containing saved records
			this.savedRecords = {};
			this.savedAmount = 0;
			this.firstSearch = true;

			//Get nessecary elements
			this.getElements();

			//Get element dimensions
			this.getDimensions();

			//Bind events on elements
			this.bindEvents();

			if (typeof resultsMode !== 'undefined') {
				this.config.resultsMode = true;
				this.config.resultsModeQuery = resultsMode.query;
				this.performSearch()
			}

		},

		getElements: function(){
			this.searchForm = $(this.config.searchForm);
			this.searchField = this.searchForm.find('.top-bar-search-field');
			this.resultContainer = $(this.config.resultContainer);
			this.emailNotificationSuccess = $(this.config.emailNotificationSuccess);
			this.emailNotificationFailed = $(this.config.emailNotificationFailed);

			this.notification = $(this.config.notification);
			this.notificationText = this.notification.find(this.config.notificationText);

			//Form fields and buttons
			this.sendMailButton = $(this.config.sendMailButton);
			this.emailForm = $(this.config.emailForm);
			this.emailField = $(this.config.emailForm+'-email');

			this.savedContainer = $(this.config.savedContainer);
			this.noSavedRecords = $(this.config.noSavedRecords);
			this.topSavedAmount = $(this.config.topSavedAmount);
			this.emptySavedRecordsButton = $(this.config.emptySavedRecordsButton);
		
			this.groupButton = $(this.config.groupButton);
			this.groupList = $(this.config.groupList);
			this.groups = $(this.config.groups);
			
			this.filters = $(this.config.filters).not(this.groupButton);

			//Result card method
			this.resultCard = new function() {
				var _self = this;
				this.format = 'link';
				this.title = "undefined";
				this.subheader = 'undefined';
				this.url = 'http://www.example.com';
				this.identifier = 'undefined';
				this.template = '<div class="card show {{{saved}}}" data-identifier="{{{identifier}}}">
						<div class="card-overlay"></div>
						<div class="card-top">
							<div class="card-headings">
								<h1 class="card-header">
									<a href="{{{url}}}" target="_blank" title="{{{title}}}">{{{title}}}</a>
								</h1>
								<h2 class="card-subheader">{{{subheader}}}</h2>
							</div>
							<a href="#check" class="card-button" title="Toevoegen aan selectie">
								<i class="mdi"></i>
							</a>
						</div>
						<div class="card-bottom">
							<p class="card-bottom-content">
								<i class="mdi {{{format}}} card-bottom-icon"></i>
								<a href="{{{url}}}" target="_blank" class="card-bottom-link">Bekijken</a>
								<a href="{{{url}}}" target="_blank" class="card-bottom-url">{{{url}}}</a>
							</p>
						</div>
					</div>';
				this.getCard = function () {
					return $.parseHTML(_self.template
						.replace('{{{format}}}',(_self.format == 'video' ? 'mdi-video' : 'mdi-link-variant'))
						.replace('{{{saved}}}',(_self.saved ? 'is-card-saved' : ''))
						.replace('{{{identifier}}}',_self.identifier)
						.replace('{{{subheader}}}',_self.subheader)
						.replace(new RegExp('{{{title}}}', 'g'),_self.title)
						.replace(new RegExp('{{{url}}}', 'g'),_self.url));
				};
			}

			this.savedItem = new function(){
				var _self = this;
				this.title = 'undefined';
				this.url = 'http://www.example.com';
				this.identifier = 'undefined';

				this.template = '<li class="saved-item" data-identifier="{{{identifier}}}">
					<p class="saved-item-content">
						<a href="{{{url}}}" target="_blank" class="saved-item-title">{{{title}}}</a>
						<a href="{{{url}}}" target="_blank" class="saved-item-url">{{{url}}}</a>
						<a class="saved-item-delete">
							<i class="mdi mdi-delete"></i>
						</a>
					</p>
				</li>';

				this.getSavedItem = function(){
					return $.parseHTML(_self.template.replace('{{{identifier}}}',_self.identifier).replace('{{{title}}}',_self.title).replace(new RegExp('{{{url}}}', 'g'),_self.url));
				}
			}
		},
		getDimensions: function(){
			this.cardWidth = $('.card').first().outerWidth();
			this.resultContainerWidth = this.resultContainer.width();
		},
		bindEvents: function(){
			var _self = this;

			//Bind click on selectie legen button
			this.emptySavedRecordsButton.on('click',function(e){
				e.preventDefault();
				_self.savedRecords = [];
				$('.card').removeClass('is-card-saved')
				_self.renderSavedItems();
				return false;
			})

			//Bind click on filters
			this.filters.on('click',function(ev){
				ev.preventDefault();

				//Set classes
				_self.filters.removeClass('is-filter-active');
				$(this).addClass('is-filter-active');

				//Set filter
				_self.setFilter($(this).attr('data-filter'));

				//Prepare to search!
				_self.prepareSearch();

				return false;
			});
			this.groupButton.on('click',function(ev){
				ev.preventDefault();
				_self.groupList.toggleClass('is-visible');
				return false;
			})
			//Bind click on filters
			this.groups.on('click',function(ev){
				ev.preventDefault();

				//Set group
				_self.setGroup($(this).attr('data-group'));

				//Set UI
				_self.groupButton.html($(this).html());
				_self.groupList.removeClass('is-visible');

				//Prepare to search!
				_self.prepareSearch();

				return false;
			});
			//Bind submit event on search box
			this.searchForm.on('submit',function(e){
				e.preventDefault();

				//Prepare to search!
				_self.prepareSearch();

				return false;
			});

			//On click on sendmailbutton
			this.sendMailButton.on('click',function(e){
				e.preventDefault();
				
				if(!$(this).hasClass('is-disabled')){
					//Check if form has active class
					if(_self.emailForm.hasClass('is-form-active')){
						//It's active, so try to send mail
						_self.emailForm.trigger('submit');
					}else{
						//It's not active, so add the active class
						_self.emailForm.addClass('is-form-active');
					}
				}

				return false;
			});

			//On emailform submit
			this.emailForm.on('submit',function(e){
				e.preventDefault();

				_self.mailRecords();

				return false;
			});

			//Refresh app dimensions on resize
			$(window).on('resize',function() {
				$('.content-pusher').css('min-height',$(window).height()-140);
				_self.getDimensions();

				//Reset previous scroll position, because resizing might mess it up.
				_self.sPrev = 0;
			});
			$('.content-pusher').css('min-height',$(window).height()-140);

			var TO = false, DO = true, percentage;
			//Bind debounced scroll on creation
			//Variables  for scroll handling
			var s,de,d=$(document),c;
			$(window).on('scroll',function() {
				//On scroll, get current scroll
				s = $(this).scrollTop();
	
				//Calculate percentage
				de = d.height();
				c = $(this).height();
				percentage = (de - (s+c));
				if ( (percentage<400 && DO === true)){

					//Handle scroll
					_self.performSearch(_self.getCardAmount());

					//Don't execute for another 700ms
					DO = false;
					TO = setTimeout(function(){
						DO = true;
						if(percentage<300)_self.performSearch(_self.getCardAmount());
					}, 600);
				}
				
			});
		},
		prepareSearch: function(){
			//Check if the current search is not the same search or filters are different
			if((this.searchField.val()!=='' || this.config.resultsMode) && (this.searchField.val() !== this.searchTerm || this.prevFilter !== this.currentFilter || this.prevGroup !== this.currentGroup)){

				//Set prev filter
				this.prevFilter = this.currentFilter;

				//Set prev group
				this.prevGroup = this.currentGroup;

				//Set prev searchterm
				this.prevSearchTerm = this.searchTerm;

				//Set searchterm
				this.searchTerm = this.searchField.val().trim();

				//Initialise new search
				this.initNewSearch();

				//Perform a new search
				var _self = this;

				//Set class on top bar to fold in
				if(this.firstSearch){
					$('.top-bar').removeClass('is-top-bar-initial');
					$('.introduction-holder').fadeOut();
					$('body').removeClass('is-intro');
				}

				//Perform search
				setTimeout(function(){ _self.performSearch(_self.getCardAmount()); }, this.firstSearch ? 400 : 800);

			}else{
				//Someone performed the same search multiple times. Funny guy...
				console.log('Same search, funny guy...');
			}
		},
		getCardAmount: function(){
			if(!this.resultContainerWidth || !this.cardWidth){
				this.getDimensions();
				return 10;
			}
			var perRow = Math.floor(this.resultContainerWidth/this.cardWidth);

			var residue = this.fetched % perRow;

			return perRow + (perRow - residue);
		},
		setGroup:function(group){
			switch(group){
				case 'all':
					this.currentGroup = 'lom.educational.context=PO or lom.classification.obk.educationallevel.id="512e4729-03a4-43a2-95ba-758071d1b725"';
					break;
				case '1':
					this.currentGroup = 'lom.classification.obk.educationallevel.id="82ca4442-246c-44b3-a562-7b101793feb4"';
					break;
				case '2':
					this.currentGroup = 'lom.classification.obk.educationallevel.id="c007e4dd-a3d4-4f33-902d-778e3bbeeddb"';
					break;
				case '3':
					this.currentGroup = 'lom.classification.obk.educationallevel.id="25a2f4f4-cf91-4b16-94bc-6d9e6fad88f4"';
					break;
				case '4':
					this.currentGroup = 'lom.classification.obk.educationallevel.id="5c072b3f-7f58-40ee-9799-27981f0a6b2b"';
					break;
				case '5':
					this.currentGroup = 'lom.classification.obk.educationallevel.id="bc213214-b83d-4673-b9c1-8fdaa63d6d56"';
					break;
				case '6':
					this.currentGroup = 'lom.classification.obk.educationallevel.id="abfb190f-e814-46f5-a9cc-ebd53f04018e"';
					break;
				case '7':
					this.currentGroup = 'lom.classification.obk.educationallevel.id="a4813bb6-cf63-4594-af56-6afb321723d8"';
					break;
				case '8':
					this.currentGroup = 'lom.classification.obk.educationallevel.id="95138558-9f65-4888-8ea3-8acce5eea273"';
					break;
				default:
					case '6':
					this.currentGroup = 'lom.educational.context=PO or lom.classification.obk.educationallevel.id="512e4729-03a4-43a2-95ba-758071d1b725"';
					break;
			}
		},
		setFilter:function(filter){
			switch(filter){
				case 'all':
					this.currentFilter = '';
					break;
				case 'info':
					this.currentFilter = 'lom.general.aggregationlevel exact "2" and (lom.educational.learningresourcetype exact "informatiebron" or lom.educational.learningresourcetype exact "gereedschap" or lom.educational.learningresourcetype exact "handleiding" or lom.educational.learningresourcetype exact "professionaliseringsmateriaal")';
					break;
				case 'opdracht':
					this.currentFilter = 'lom.general.aggregationlevel exact "2" and (lom.educational.learningresourcetype exact "open opdracht" or lom.educational.learningresourcetype exact "gesloten opdracht" or lom.educational.learningresourcetype exact "verkennings- en onderzoeksmateriaal")';
					break;
				case 'toets':
					this.currentFilter = 'lom.general.aggregationlevel exact "2" and (lom.educational.learningresourcetype exact "evaluatie- en toetsmateriaal")';
					break;
				case 'les':
					this.currentFilter = 'lom.general.aggregationlevel exact "3"';
					break;
				case 'video':
					this.currentFilter = '&technicalFormats=video';
					break;
				case 'apps':
					this.currentFilter = 'about.repository exact "eduapp_apps"';
					break;
				default:
					this.currentFilter = 'lom.general.aggregationlevel exact "2" and (lom.educational.learningresourcetype exact "informatiebron" or lom.educational.learningresourcetype exact "gereedschap" or lom.educational.learningresourcetype exact "handleiding" lom.educational.learningresourcetype exact "professionaliseringsmateriaal")';
					break;
			}
		},
		initNewSearch: function(){
			//Reset all values needed for search
			this.hideNotification();

			//Which means no wtf's occured
			this.wtf = false;
			
			//No nopes occured
			this.nope = false;

			//We fetched zero objects
			this.fetched = 0;

			//Prev scroll pos to zero
			this.sPrev=0;

			//We found nothing yet, so lose the array
			this.foundRecords = [];

			this.deleteResultCards();
		},
		lastRecordFound: function(){
			//We found the last record...
			console.log('No more records. Go do something funny...');
		},
		performSearch: function(amount){
			var _self = this;
			this.firstSearch = false;

			//Still searching or encountering a wtf situation
			if(this.wtf){
				//We encountered a wtf. Which means a request failed three times in a row... 
				console.log('Don\'t know what went wrong, but wtf...');
				this.showNotification('Er is iets misgegaan');
				return false;
			}
			if(this.nope){
				//Nope means that a bogus searchterm has been used. No results on the first hit... So no need to do another request then
				console.log('Nope... That\'s a bogus searchterm');
				return false;
			}
			if(this.searching){
				//We are currently performing a search. Let's not search again untill it's finished.
				return false;
			}

			//Check if we already fetched something
			if(this.fetched > 0 && this.fetched + 1 > this.totalRecords){
				this.lastRecordFound();
				return false;
			}

			//Ok now we can start searching
			this.searching = true;
			
			if(this.fetched === 0){
				amount = 25;
			}

			//Try to fetch JSON result
			if(!this.config.resultsMode){
				//Filter the search term
				var	term = this.searchTerm.replace(/ /g,' AND ');
				var filter = this.currentFilter !=='' ? ( this.currentFilter.substring(0, 1) == "&" ? this.currentFilter : ' AND ('+encodeURI(this.currentFilter) +')'):'';
				var conditions = ' AND (lom.rights.cost=no AND (lom.general.aggregationlevel=2 OR lom.general.aggregationlevel=3) not (about.repository exact Digischool OR about.repository exact KlasCement OR lom.lifecycle.contribute.publisher exact Digischool) not lom.technical.format=non-digital)';
				var group = this.currentGroup ? ' AND ('+encodeURI(this.currentGroup)+') ':'';
			}else{
				var	term = '';
				var filter = this.config.resultsModeQuery;
				var group ="";
				var conditions = "";
			}
			
			//Perform request
			$.getJSON( "http://proxy.edurep.nl/latest/search?mode=json&query="+ term + conditions + filter +group+"&maximumRecords="+amount+"&startRecord="+(this.fetched + 1)+"&callback=?" )
			.done(function(data) {
				//Yes, we did not fail, so the fail-o-meter can be set to zero
				_self.fail = 0;

				//Var to store identifiers while looping
				var identifier = '';
				
				//If we've not yet fetched a thing, check the total amount of found records
				if(_self.fetched === 0){
					_self.totalRecords = data.search.recordcount;

					//Check for epic failure
					if(!_self.totalRecords || !data.search.recordcount){
						_self.nope = true;
					}
				}

				//Do we have records
				if(data.search.records){
					//Add the amount of found records in the current set to fetched
					_self.fetched += data.search.records.length;
					
					//Loop through found records
					for (var i = data.search.records.length - 1; i >= 0; i--) {

						//Get record identifier
						identifier = data.search.records[i].identifier.recordidentifier;

						//If not present, add the record to foundRecords
						if(_self.foundRecords.indexOf(identifier) === -1){
							_self.foundRecords[identifier] = data.search.records[i];
							_self.addResultCard(data.search.records[i].title, data.search.records[i].publisher.name, data.search.records[i].url.location, identifier, data.search.records[i].format.mapped_format,_self.savedRecords[identifier]==undefined ? false: true);
						}
					};

					//Less results than requested. There can't be more records...
					if(data.search.records.length < amount){
						if(filter){
							_self.showNotification(_self.config.lastResultFilter);
						}else{
							_self.showNotification(_self.config.lastResult);
						}
					}
				}else{
					//No records in search
					if(_self.fetched === 0){
						if(filter){
							_self.showNotification(_self.config.noResultFilter);
						}else{
							_self.showNotification(_self.config.noResult);
						}
					}else{
						if(filter){
							_self.showNotification(_self.config.lastResultFilter);
						}else{
							_self.showNotification(_self.config.lastResult);
						}
					}
				}
			})
			.fail(function() {
				//OMG, failure. Up the fail-o-meter!!!
				_self.fail = _self.fail + 1;

				//If we fail three times in a row, we call wtf...
				if(_self.fail > 3){
					//Really... wtf...
					_self.wtf = true;
				}
				console.log('Data ophalen is gruwelijk gefaald.');
			})
			.always(function() {
				console.log(_self.foundRecords,_self.fetched);
				//We're done searching....
				_self.searching = false;
			});
		},
		addResultCard: function(title, subheader, url, identifier, format, saved){
			var resultCard = this.resultCard, _self = this;
			resultCard.title = title;
			resultCard.subheader = subheader;
			resultCard.url = url;
			resultCard.identifier = identifier;
			resultCard.format = format;
			resultCard.saved = saved;

			var card = $(resultCard.getCard());
			card.find('.card-button').on('click',function(ev){
				ev.preventDefault();
				_self.handleCardClick(this);
				return false;
			});
			this.resultContainer.append(card);
		},
		addSavedItem: function(title,url,identifier){
			var savedItem = this.savedItem, _self = this;
			
			savedItem.title = title;
			savedItem.url = url;
			savedItem.identifier = identifier;

			var card, identifier, savedCard = $(savedItem.getSavedItem());;
			savedCard.find('.saved-item-delete').on('click',function(ev){
				ev.preventDefault();

				card = $(this).parents('.saved-item');
				identifier = card.attr('data-identifier');

				delete _self.savedRecords[identifier];
				_self.renderSavedItems();

				//find card
				$('.card[data-identifier="'+identifier+'"]').removeClass('is-card-saved');

				return false;
			});

			this.savedContainer.append(savedCard);
		},
		handleCardClick:function(el){
			//Get element
			var card = $(el).parents('.card'),record;

			//Get item clicked on
			var identifier = card.attr('data-identifier');

			//Check already saved
			if(this.savedRecords[identifier]){
				//Already present
				record = this.savedRecords[identifier];

				//Remove
				delete this.savedRecords[identifier];
				
				//Add Class
				card.removeClass('is-card-saved');

			}else{
				//Not yet present
				record = this.foundRecords[identifier];

				//Add
				this.savedRecords[identifier] = this.foundRecords[identifier];

				//Remove Class
				card.addClass('is-card-saved');
			}

			this.renderSavedItems();
		},
		renderSavedItems: function(){
			var record, _self = this;
			this.savedContainer.empty();
			
			var found = 0;
			for (var key in this.savedRecords) {
				if (this.savedRecords.hasOwnProperty(key)){
					found ++;
					record = this.savedRecords[key];
					this.addSavedItem(record.title,record.url.location,key);
				}
			}

			if(!found){
				this.noSavedRecords.show();
				this.sendMailButton.addClass('is-disabled');
			}else{
				this.noSavedRecords.hide();
				this.sendMailButton.removeClass('is-disabled');
			}

			//Animation
			this.topSavedAmount.removeClass('animate').width();
			this.topSavedAmount.addClass('animate');
			
			//Set status and set UI.
			this.savedAmount = found;
			this.topSavedAmount.html(found>0?found:'');

		},
		deleteResultCards: function(){
			$('.card').removeClass('shown').addClass('hide').delay(1000).queue(function () {
				$('.card.hide').remove();
			});
		},
		refreshGrid:function(){
			//Refresh the grid
		},
		mailRecords:function(){
			var _self = this;
			var found = 0;
			var emailRegex = /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/;

			for (var key in this.savedRecords) {
				if (this.savedRecords.hasOwnProperty(key)){
					found ++;
				}
			}

			if(found < 1){
				console.log('Niets geselecteerd');
				this.mailRecordsError();
				return false;
			}

			if(this.emailField.val() == '' || !emailRegex.test(this.emailField.val())){
				console.log('Rare email');
				this.emailForm.addClass('saved-actions-form-error');
				setTimeout(function(){
					_self.emailForm.removeClass('saved-actions-form-error');
				}, 500);
				return false;
			}

			$.post( "sendmail.php", {'records':JSON.stringify(_self.savedRecords),'email':this.emailField.val()})
			.done(function(data) {
				if(data == '1'){
					_self.mailRecordsSuccess();
				}else{
					_self.mailRecordsError();
				}
			})
			.fail(function(data) {
				_self.mailRecordsError();
			})
			.always(function() {
				_self.afterMailRecords();
			});
		},
		mailRecordsSuccess: function(){
			console.log('Wow. You\'ve got mail!');
			
			this.emailNotificationSuccess.removeClass('show');
			this.emailNotificationSuccess.width();
			this.emailNotificationSuccess.addClass('show');

			this.emailField.val('');
		},
		mailRecordsError: function(){
			console.log('An error occured while mailing...');

			this.emailNotificationFailed.removeClass('show');
			this.emailNotificationFailed.width();
			this.emailNotificationFailed.addClass('show');
		},
		afterMailRecords: function(){
			console.log('Tried mailing. Done with that.');
		},
		showNotification: function(message){
			this.notificationText.html(message);
			this.notification.addClass('is-search-results-notification-active');
		},
		hideNotification: function(){
			this.notification.removeClass('is-search-results-notification-active');
		}
	};
	$.fn.SearchRecords = function(options) {
		return this.each(function() {
			new SearchRecords(this, options).init();
		});
	};
})(jQuery, window, document);