var CANVAS, CONTEXTO, BOTON, MARCADOR;

var V_MIN;
var V_MAX;
var aceleracion;
var tocando_canvas;
var posicion_touch;
var tecla_arriba, tecla_abajo;
var jugando;

var pelota, jugador, enemigo;

const GANADOR =
{
	PUNTOS: 10,
	NINGUNO: 'ninguno',
	JUGADOR: 'jugador',
	ENEMIGO: 'enemigo'
}

class Vector
{
	constructor(x, y)
	{
		this.x = x;
		this.y = y;
	}

	// Operaciones vector -> vector
	mas(vector)   { return new Vector(this.x + vector.x, this.y + vector.y); }
	menos(vector) { return new Vector(this.x - vector.x, this.y - vector.y); }
	punto(vector) { return (this.x * vector.x) + (this.y * vector.y); }

	// Operacion vector -> escalar
	por_e(escalar)   { return new Vector(this.x * escalar, this.y * escalar); }
	entre_e(escalar) { return new Vector(this.x / escalar, this.y / escalar); }

	// Operaciones del vector
	norma()    { return Math.sqrt(this.x**2 + this.y**2); }
	norma2()   { return this.x**2 + this.y**2; }
	copia()    { return new Vector(this.x, this.y); }

	// Normalizacion del vector
	normalizar()
	{
		var norma = this.norma();

		if (norma == 0)
			return new Vector(0, 0);

		return this.entre_e(norma);
	}
}

class Figura
{
	constructor(x, y)
	{
		this.posicion = new Vector(x, y);
		this.velocidad = new Vector(0, 0);
	}

	mover(fuerza, dt, fuerza_absoluta)
	{
		var aceleracion = new Vector(0, 0);

		if (!fuerza_absoluta)
		{
			var masa_relativa = 1 / (1 - (this.velocidad.norma2() / V_MAX**2));

			if (masa_relativa > 0)
				aceleracion = fuerza.entre_e(masa_relativa);
			else
				this.velocidad = this.velocidad.normalizar().por_e(V_MAX);
		}
		else
			aceleracion = fuerza;		

		this.velocidad = this.velocidad.mas(aceleracion.por_e(dt));
		this.posicion = this.posicion.mas(this.velocidad.por_e(dt));
	}

	aplicar_friccion(friccion, v_minima)
	{
		if (this.velocidad.norma2() > v_minima**2)
			this.velocidad = this.velocidad.por_e(1 - friccion);
	}
}

class Pelota extends Figura
{
	constructor(x, y, radio)
	{
		super(x, y);
		this.radio = radio;
	}

	dibujar(contexto, color)
	{
		var x = this.posicion.x;
		var y = this.posicion.y;
		contexto.fillStyle = color;

		contexto.beginPath();
		contexto.arc(x, y, this.radio, 0, 2*Math.PI);
		contexto.fill();
		contexto.closePath();
	}

	colisionar_con_muros()
	{
		var ganador = GANADOR.NINGUNO;
		const X_MIN = this.radio;
		const Y_MIN = this.radio;
		const X_MAX = CANVAS.width - this.radio;
		const Y_MAX = CANVAS.height - this.radio;

		if (this.posicion.x > X_MAX)
		{
			this.posicion.x = X_MAX;
			this.velocidad.x *= -1;
			ganador = GANADOR.JUGADOR;
		}
		else if (this.posicion.x < X_MIN)
		{
			this.posicion.x = X_MIN;
			this.velocidad.x *= -1;
			ganador = GANADOR.ENEMIGO;
		}

		if (this.posicion.y > Y_MAX)
		{
			this.posicion.y = Y_MAX;
			this.velocidad.y *= -1;
		}
		else if (this.posicion.y < Y_MIN)
		{
			this.posicion.y = Y_MIN;
			this.velocidad.y *= -1;
		}

		return ganador;
	}
}

class Raqueta extends Figura
{
	constructor(x, y, base, altura)
	{
		super(x, y);
		this.puntos = 0;
		this.base = base;
		this.altura = altura;
		this.recargar_maximos();
	}

	recargar_maximos()
	{
		this.X_MAX = this.base / 2;
		this.Y_MAX = this.altura / 2;
	}

	probar_colision(circulo)
	{
		var distancia = circulo.posicion.menos(this.posicion);
		var distancia_acotada = distancia.copia();
		var normal = new Vector(0, 0);

		if (distancia.x < -this.X_MAX)
			distancia_acotada.x = -this.X_MAX;
		else if (distancia.x > this.X_MAX)
			distancia_acotada.x = this.X_MAX;

		if (distancia.y < -this.Y_MAX)
			distancia_acotada.y = -this.Y_MAX;
		else if (distancia.y > this.Y_MAX)
			distancia_acotada.y = this.Y_MAX;

		var punto_mas_cercano = this.posicion.mas(distancia_acotada);
		var distancia_menor = circulo.posicion.menos(punto_mas_cercano).norma();

		if (distancia_menor < circulo.radio)
		{
			if (Math.abs(distancia_acotada.x) == this.X_MAX)
				normal.x = distancia_acotada.x;
			if (Math.abs(distancia_acotada.y) == this.Y_MAX)
				normal.y = distancia_acotada.y;
			if (normal.norma2() == 0)
				normal = distancia;

			var penetracion = circulo.radio - distancia_menor + 1;
			var desplazamiento = distancia.por_e(penetracion / distancia.norma());
			circulo.posicion = circulo.posicion.mas(desplazamiento);
		}

		return normal;
	}

	ajustar_velocidades(circulo, normal, lambda, lambda_f)
	{
		// Se hace el calculo para el rebote
		var velocidad = circulo.velocidad.menos(this.velocidad);
		var impulso = (lambda + 1) * (velocidad.punto(normal) / normal.punto(normal));
		circulo.velocidad = circulo.velocidad.menos(normal.por_e(impulso * 1.2));

		circulo.velocidad.x += Math.sign(circulo.velocidad.x) * Math.abs(this.velocidad.y) / 2;
		circulo.velocidad.y += this.velocidad.y * (CANVAS.height / CANVAS.width) * 2;
	}

	contacto(circulo, lambda, lambda_f)
	{
		var normal = this.probar_colision(circulo);

		if (normal.norma2() > 0)
			this.ajustar_velocidades(circulo, normal, lambda, lambda_f);
	}

	dibujar(contexto, color)
	{
		var x = this.posicion.x - this.X_MAX;
		var y = this.posicion.y - this.Y_MAX;
		contexto.fillStyle = color;

		contexto.beginPath();
		contexto.rect(x, y, this.base, this.altura);
		contexto.fill();
		contexto.closePath();
	}

	colisionar_con_muros()
	{
		const Y_MIN = this.altura / 2;
		const Y_MAX = CANVAS.height - (this.altura / 2);

		if (this.posicion.y > Y_MAX)
		{
			this.posicion.y = Y_MAX;
			this.velocidad.y *= -0.5;
		}
		else if (this.posicion.y < Y_MIN)
		{
			this.posicion.y = Y_MIN;
			this.velocidad.y *= -0.5;
		}
	}
}

function sleep(milliseconds)
{
	const date = Date.now();
	let currentDate = null;
	do
	{
	  currentDate = Date.now();
	}
	while (currentDate - date < milliseconds);
}

function juego()
{
	CONTEXTO.clearRect(0, 0, CANVAS.width, CANVAS.height);

	enemigo.dibujar(CONTEXTO, "#FFFFFF");
	jugador.dibujar(CONTEXTO, "#FFFFFF");
	pelota.dibujar(CONTEXTO, "#FFFFFF");

	if (jugador.puntos == GANADOR.PUNTOS)
	{
		MARCADOR.innerHTML = 'Ganaste';
		BOTON.style.display = 'block';
		BOTON.innerText = "Reiniciar";
		return;
	}

	if (enemigo.puntos == GANADOR.PUNTOS)
	{
		MARCADOR.innerHTML = 'Perdiste';
		BOTON.style.display = 'block';
		BOTON.innerText = "Reiniciar";
		return;
	}

	if (tocando_canvas)
	{
		aceleracion = posicion_touch.menos(jugador.posicion);
		aceleracion = aceleracion.menos(jugador.velocidad);
		aceleracion = aceleracion.por_e(20);
		aceleracion.x = 0;
	}
	else
	{
		if (tecla_arriba)
			aceleracion.y -= 150;
		if (tecla_abajo)
			aceleracion.y += 150;

		aceleracion = aceleracion.por_e(0.8);
	}

	delta = pelota.posicion.menos(enemigo.posicion);
	delta = delta.menos(enemigo.velocidad);
	delta = delta.por_e(5);
	delta.x = 0;
	
	jugador.mover(aceleracion, 0.1, true);
	jugador.aplicar_friccion(0.2, 0);
	enemigo.mover(delta, 0.1, true);
	enemigo.aplicar_friccion(0.2, 0);

	pelota.mover(new Vector(0, 0), 0.1, false);
	pelota.aplicar_friccion(0.005, 50);

	var ganador = pelota.colisionar_con_muros();
	jugador.colisionar_con_muros();
	enemigo.colisionar_con_muros();

	if (ganador == GANADOR.JUGADOR)
	{
		jugador.puntos += 1;
		MARCADOR.innerHTML = jugador.puntos + ' | ' + enemigo.puntos;

		if (jugador.puntos < GANADOR.PUNTOS)
			ajustar_objetos();
	}

	if (ganador == GANADOR.ENEMIGO)
	{
		enemigo.puntos += 1;
		MARCADOR.innerHTML = jugador.puntos + ' | ' + enemigo.puntos;

		if (enemigo.puntos < GANADOR.PUNTOS)
			ajustar_objetos();
	}

	jugador.contacto(pelota, 1, 0);
	enemigo.contacto(pelota, 1, 0);
}

function tecla_presionada(e)
{
    if (e.key === 'ArrowUp')
		tecla_arriba = true;
    else if (e.key === 'ArrowDown')
        tecla_abajo = true;
}

function tecla_suelta(e)
{
    if (e.key === 'ArrowUp')
		tecla_arriba = false;
    else if (e.key === 'ArrowDown')
        tecla_abajo = false;
}

function movimiento_touch(e)
{
	if (tocando_canvas)
	{
		var limites = CANVAS.getBoundingClientRect();
		var x = e.touches[0].clientX - limites.left;
		var y = e.touches[0].clientY - limites.top;
		posicion_touch = new Vector(x, y);
	}
}

function ajustar_canvas()
{
	var estilo_calculado = getComputedStyle(CANVAS);
	var ancho = estilo_calculado.width;
	var alto = estilo_calculado.height;
	CANVAS.width = ancho.replace('px', '');
	CANVAS.height = alto.replace('px', '');
}

function ajustar_objetos()
{
	const X_MAX = CANVAS.width;
	const Y_MAX = CANVAS.height;
	const X_MID = X_MAX / 2;
	const Y_MID = Y_MAX / 2;
	const RADIO = (X_MAX + Y_MAX) / 100;
	V_MIN = CANVAS.width / 10;
	V_MAX = CANVAS.width / 5;

	pelota.posicion.x = X_MID;
	pelota.posicion.y = Y_MID;
	pelota.radio = RADIO;
	pelota.velocidad.x = V_MIN;
	pelota.velocidad.y = (V_MIN * Math.random()) - (V_MIN / 2);

	jugador.posicion.x = RADIO / 2;
	jugador.posicion.y = Y_MID;
	jugador.base = RADIO;
	jugador.altura = Y_MAX / 4;
	jugador.recargar_maximos();
	jugador.velocidad = new Vector(0, 0);

	enemigo.posicion.x = X_MAX - (RADIO / 2);
	enemigo.posicion.y = Y_MID;
	enemigo.base = RADIO;
	enemigo.altura = Y_MAX / 4;
	enemigo.recargar_maximos();
	enemigo.velocidad = new Vector(0, 0);
}

function inicializar_objetos()
{
	tocando_canvas = false;
	tecla_arriba = false;
	tecla_abajo = false;
	jugando = false;

	aceleracion = new Vector(0, 0);
	pelota = new Pelota(0, 0, 0);
	jugador = new Raqueta(0, 0, 0, 0);
	enemigo = new Raqueta(0, 0, 0, 0);
}

function inicializar_enlaces()
{
	CANVAS = document.getElementById('canvas');
	CONTEXTO = CANVAS.getContext('2d');
	BOTON = document.getElementById('boton');
	MARCADOR = document.getElementById('marcador');
}

function inicializar_eventos()
{
	BOTON.addEventListener('click', function()
	{
		MARCADOR.innerHTML = '0 | 0';
		BOTON.style.display = 'none';

		jugando = true;
		recargar_todo();

		jugador.puntos = 0;
		enemigo.puntos = 0;
	});

	window.addEventListener("keydown", e =>
	{
		if (e.key === 'ArrowUp' || e.key === 'ArrowDown')
			e.preventDefault();
	});
	
	window.addEventListener('keyup', tecla_suelta);
	window.addEventListener('keydown', tecla_presionada);
	window.addEventListener('resize', function() { recargar_todo() });

	CANVAS.addEventListener('touchmove', movimiento_touch);
	CANVAS.addEventListener('touchend', function() { tocando_canvas = false; });
	CANVAS.addEventListener('touchstart', e => { tocando_canvas = true; movimiento_touch(e) });

	setInterval(juego, 10);
}

function inicializar_todo()
{
	inicializar_objetos();
	inicializar_enlaces();
	inicializar_eventos();
}

function recargar_todo()
{
	if (jugando)
	{
		ajustar_canvas();
		ajustar_objetos();
	}
}

window.onload = inicializar_todo();