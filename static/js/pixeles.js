var canvas;
var contexto;

function inicio()
{
	canvas = document.getElementById("canvas1");
	contexto = canvas.getContext("2d");
	imagen();
}

function filtro_convolucional(datos_imagen, filtro)
{
	var dimension = Math.round(Math.sqrt(filtro.length));
	var mitad_dim = Math.floor(dimension / 2);

	var origen = datos_imagen.data;
	var ancho = datos_imagen.width;
	var alto = datos_imagen.height;

	var resultado = contexto.createImageData(datos_imagen);
	var destino = resultado.data;

	for (var y = 0; y < alto; y++)
	{
		for (var x = 0; x < ancho; x++)
		{
			var R = 0;
			var G = 0;
			var B = 0;
			var A = 0;

			for (var y_filtro = 0; y_filtro < dimension; y_filtro++)
			{
				for (var x_filtro = 0; x_filtro < dimension; x_filtro++)
				{
					var x_origen = Math.min(ancho - 1, Math.max(0, x + x_filtro - mitad_dim));
					var y_origen = Math.min(alto - 1, Math.max(0, y + y_filtro - mitad_dim));
					var indice_origen = 4 * ((y_origen * ancho) + x_origen);
					var peso = filtro[y_filtro * dimension + x_filtro];

					R += origen[indice_origen] * peso;
					G += origen[indice_origen + 1] * peso;
					B += origen[indice_origen + 2] * peso;
					A += origen[indice_origen + 3] * peso;
				}
			}

			var indice_destino = 4 * ((y * ancho) + x);

			destino[indice_destino] = R;
			destino[indice_destino + 1] = G;
			destino[indice_destino + 2] = B;
			destino[indice_destino + 3] = 255;
		}
	}

	return resultado;
}

function imagen()
{
	var imagen = new Image();
	imagen.crossOrigin = 'anonymous';

	imagen.onload = function()
	{
		contexto.drawImage(imagen, 0, 0, canvas.width, canvas.height);
		var datos_imagen = contexto.getImageData(0, 0, canvas.width, canvas.height);

		var filtro = [];
		var intensidad = 6;

		for (var i = 0; i < intensidad**2; i++)
			filtro[i] = 1 / intensidad**2;

		// Se aplica un filtro de desenfoque con radio de 6 pixeles
		var filtrado = filtro_convolucional(datos_imagen, filtro);
		pixeles = filtrado.data;

		// Se hace un degradado de oscuro a claro
		for (var y = 0; y < filtrado.height; y++)
		{
			for (var x = 0; x < filtrado.width; x++)
			{
				var indice = 4 * ((y * filtrado.width) + x);

				pixeles[indice] *= y / filtrado.height * 1.5;
				pixeles[indice + 1] *= y / filtrado.height * 1.5;
				pixeles[indice + 2] *= y / filtrado.height * 1.5;
			}
		}

		contexto.putImageData(filtrado, 0, 0);
	}
	
	imagen.src = './static/img/codigo.jpg';
}

window.onload = inicio;