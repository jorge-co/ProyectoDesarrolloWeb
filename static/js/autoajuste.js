var overflow = false;
var body = document.getElementById("body");
var principal = document.getElementById("principal");

function auto_ajustar()
{
	console.log("Body: " + body.scrollHeight);
	console.log("Prin: " + principal.clientHeight);

	if (overflow && body.scrollHeight > principal.clientHeight)
	{
		principal.style.height = "100%";
		overflow = false;
	}

	if (!overflow && body.scrollHeight > principal.clientHeight)
	{
		principal.style.height = "auto";
		overflow = true;
	}
}

window.onload = auto_ajustar();
window.addEventListener('resize', auto_ajustar);