namespace IPVG.Sede.Core;

public class ColaboradorSede
{
    public const decimal SueldoMinimoLegal = 500_000m;

    private decimal sueldoBase;

    public ColaboradorSede(string rut, string nombre, decimal sueldoBase)
    {
        Rut = rut;
        Nombre = nombre;
        SueldoBase = sueldoBase;
    }

    // Accesible solo desde esta clase y sus derivadas.
    protected string Rut { get; set; }

    public string Nombre { get; set; }

    // Propiedad completa: si el valor es inferior al mínimo legal, se asigna el mínimo.
    public decimal SueldoBase
    {
        get { return sueldoBase; }
        set { sueldoBase = value < SueldoMinimoLegal ? SueldoMinimoLegal : value; }
    }

    public virtual decimal CalcularSueldoTotal()
    {
        return SueldoBase;
    }

    public override string ToString()
    {
        return $"RUT: {Rut} | Nombre: {Nombre} | Sueldo base: {SueldoBase:C0} | Sueldo total: {CalcularSueldoTotal():C0}";
    }
}
