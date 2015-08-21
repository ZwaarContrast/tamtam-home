(function($) {
	$(document).ready(function(){

	});

	$(window).load(function(){
		var scrollPosition, percentage = 0 ,opacity=1,push =0,myWindow = $(window),degrees,bg = $('.sidebar-background'),content = $('.sidebar-text'),menu = $('.sidebar-menu');;


		function repeatOften() {
  			// Do whatever
  			scrollPosition = myWindow.scrollLeft();
  			percentage =(scrollPosition/250);
  			
  				degrees = 15 - percentage*15;	


  				degrees = Math.max(degrees,0);
  				degrees = Math.min(degrees,15);


  				push = -250*percentage;
  				opacity = 1 - percentage;	
  				opacity = opacity;
  			
  			// degrees = Math.max(degrees,0);
  			// degrees = Math.min(degrees,15)
  			console.log(degrees);


  			bg.css('transform','skew(-'+degrees+'deg)');
  			content.css('transform','translateX('+push*0.5+'px)');
  			content.css('opacity',opacity);

  			menu.css('transform','translateX('+push*0.91+'px)');
  			menu.css('opacity',opacity);


  			if(percentage>=1){
  				menu.addClass('is-shown');

  				
  				menu.css('opacity',1);
  			}else{
  				menu.removeClass('is-shown');
  				
				
  			}
  			//Call
  			requestAnimationFrame(repeatOften);

		}
		requestAnimationFrame(repeatOften);
	});
})( jQuery );


//begin at 0 scroll ---> 15degs
//end at 250 scroll --> 0 degs