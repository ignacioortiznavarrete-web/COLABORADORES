namespace IPVG.Sede.Core;

public class DocenteSede : ColaboradorSede
{
    public const decimal BonoPorHoraOtec = 12_500m;

    public DocenteSede(string rut, string nombre, decimal sueldoBase, int horasOtec)
        : base(rut, nombre, sueldoBase)
    {
        HorasOtec = horasOtec;
    }

    public int HorasOtec { get; set; }

    public override decimal CalcularSueldoTotal()
    {
        return SueldoBase + HorasOtec * BonoPorHoraOtec;
    }

    public override string ToString()
    {
        // Rut es protected: la clase derivada puede leerlo directamente.
        return $"[Docente] RUT: {Rut} | Nombre: {Nombre} | Sueldo base: {SueldoBase:C0} | " +
               $"Horas OTEC: {HorasOtec} | Sueldo total: {CalcularSueldoTotal():C0}";
    }
}
