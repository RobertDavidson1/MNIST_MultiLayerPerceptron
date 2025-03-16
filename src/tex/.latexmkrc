$cleanup_mode = 2;  # Remove all generated files except for the final PDF
$bibtex_use = 2;

$clean_ext = "aux bbl bcf blg idx ilg ind lof log lot out run.xml synctex.gz toc acn acr alg glg glo gls ist fls fdb_latexmk nav snm vrb";

# To also automatically clean up after successful compilation
$success_cmd = "cp %R.pdf ../static/ && latexmk -c %S";